// Programmatic smoke test for Socket.io flow. Starts the server in-process,
// connects two clients (Ada and Linus), and exercises add_card / move_card /
// add_comment to verify broadcasts reach both participants.
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-smoke-'));
process.env.DATA_DIR = tmpDir;
process.env.PORT = '0';

const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { io: ioc } = require(path.resolve(__dirname, '..', 'client', 'node_modules', 'socket.io-client'));

const { initDb, createBoard } = require('../server/db');
const { registerRestRoutes } = require('../server/routes');
const { registerSocketHandlers } = require('../server/sockets');

initDb();

const app = express();
app.use(cors());
app.use(express.json());
registerRestRoutes(app);
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, { cors: { origin: '*' } });
registerSocketHandlers(ioServer);

async function main() {
  await new Promise((r) => httpServer.listen(0, r));
  const port = httpServer.address().port;
  const url = `http://localhost:${port}`;

  const board = createBoard('Smoke Board');
  const { getBoard } = require('../server/db');
  const boardFull = getBoard(board.id);
  const colA = boardFull.columns[0];
  const colB = boardFull.columns[1];

  function makeClient(name) {
    return new Promise((resolve, reject) => {
      const sock = ioc(url, { transports: ['websocket'] });
      sock.on('connect', () => {
        sock.emit('join_board', { boardId: board.id, displayName: name }, (resp) => {
          if (resp?.error) return reject(new Error(resp.error));
          resolve(sock);
        });
      });
      sock.on('connect_error', reject);
    });
  }

  const ada = await makeClient('Ada');
  const linus = await makeClient('Linus');

  function waitFor(sock, event, predicate = () => true) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), 3000);
      const handler = (payload) => {
        if (predicate(payload)) {
          clearTimeout(timer);
          sock.off(event, handler);
          resolve(payload);
        }
      };
      sock.on(event, handler);
    });
  }

  // add_card from Ada — Linus should see it
  const linusSawCardAdded = waitFor(linus, 'card_added');
  const addResp = await new Promise((resolve, reject) =>
    ada.emit('add_card', { columnId: colA.id, content: 'CI is green' }, (r) =>
      r?.error ? reject(new Error(r.error)) : resolve(r)
    )
  );
  const { card } = await linusSawCardAdded;
  if (card.content !== 'CI is green' || card.author_name !== 'Ada') {
    throw new Error('card payload mismatch on broadcast');
  }
  console.log('OK add_card -> broadcast reached Linus');

  // move_card from Linus — Ada should see it
  const adaSawMove = waitFor(ada, 'card_moved');
  await new Promise((resolve, reject) =>
    linus.emit(
      'move_card',
      { cardId: addResp.card.id, toColumnId: colB.id, toIndex: 0 },
      (r) => (r?.error ? reject(new Error(r.error)) : resolve(r))
    )
  );
  const { card: moved } = await adaSawMove;
  if (moved.column_id !== colB.id) throw new Error('moved card did not land in colB');
  console.log('OK move_card -> broadcast reached Ada');

  // add_comment from Ada — Linus should see it
  const linusSawComment = waitFor(linus, 'comment_added');
  await new Promise((resolve, reject) =>
    ada.emit('add_comment', { cardId: addResp.card.id, content: 'Nice work team' }, (r) =>
      r?.error ? reject(new Error(r.error)) : resolve(r)
    )
  );
  const { comment } = await linusSawComment;
  if (comment.author_name !== 'Ada' || comment.content !== 'Nice work team') {
    throw new Error('comment payload mismatch on broadcast');
  }
  console.log('OK add_comment -> broadcast reached Linus');

  // Validate persistence via REST
  const res = await fetch(`${url}/api/boards/${board.id}`);
  const json = await res.json();
  if (json.board.cards.length !== 1) throw new Error('expected 1 card persisted');
  if (json.board.cards[0].column_id !== colB.id) throw new Error('persisted card in wrong column');
  if (json.board.comments.length !== 1) throw new Error('expected 1 comment persisted');
  console.log('OK REST refetch reflects persisted state');

  // Validate CSV export
  const csvRes = await fetch(`${url}/api/boards/${board.id}/export`);
  const csv = await csvRes.text();
  if (!csv.includes('CI is green') || !csv.includes('Nice work team')) {
    throw new Error('CSV missing card or comment');
  }
  console.log('OK CSV export contains card + comment');

  ada.close();
  linus.close();
  ioServer.close();
  httpServer.close();
  console.log('\nAll smoke checks passed.');
}

main().catch((err) => {
  console.error('SMOKE FAILED:', err);
  process.exit(1);
});
