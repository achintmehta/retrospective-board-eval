import { createRequire } from 'node:module';
const requireFromClient = createRequire(new URL('../client/package.json', import.meta.url));
const { io } = requireFromClient('socket.io-client');

const PORT = process.env.PORT || 4001;
const BASE = `http://localhost:${PORT}`;

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  return res.json();
}
async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function emit(s, event, payload) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${event} timed out`)), 5000);
    s.emit(event, payload, (ack) => {
      clearTimeout(t);
      if (!ack || ack.ok === false) reject(new Error(ack?.error || 'failed'));
      else resolve(ack);
    });
  });
}

function once(s, event, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      s.off(event, handler);
      reject(new Error(`${event} not received in time`));
    }, timeoutMs);
    function handler(payload) {
      if (predicate && !predicate(payload)) return;
      clearTimeout(t);
      s.off(event, handler);
      resolve(payload);
    }
    s.on(event, handler);
  });
}

const log = (...args) => console.log('[smoke]', ...args);

const board = await postJson('/api/boards', { title: 'Socket Smoke ' + Date.now() });
log('created board', board.id, 'columns:', board.columns.length);
const goodCol = board.columns[0]; // Went Well
const badCol = board.columns[1];  // Needs Improvement

const alice = io(BASE, { transports: ['websocket'] });
const bob = io(BASE, { transports: ['websocket'] });

await Promise.all([
  new Promise((r) => alice.once('connect', r)),
  new Promise((r) => bob.once('connect', r)),
]);
log('both connected');

await emit(alice, 'join_board', { boardId: board.id, displayName: 'Alice' });
await emit(bob, 'join_board', { boardId: board.id, displayName: 'Bob' });
log('both joined');

const bobSeesCard = once(bob, 'card_added', (p) => p.columnId === goodCol.id);
await emit(alice, 'add_card', { boardId: board.id, columnId: goodCol.id, content: 'we shipped on time' });
const cardEvent = await bobSeesCard;
log('bob received card_added; card id =', cardEvent.card.id, 'author =', cardEvent.card.authorName);
const cardId = cardEvent.card.id;

const aliceSeesMove = once(alice, 'card_moved', (p) => p.cardId === cardId);
await emit(bob, 'move_card', { cardId, toColumnId: badCol.id, toIndex: 0 });
const moveEvent = await aliceSeesMove;
log('alice received card_moved; dest =', moveEvent.destinationColumnId, 'order =', moveEvent.destinationOrder);

const aliceSeesComment = once(alice, 'comment_added', (p) => p.cardId === cardId);
await emit(bob, 'add_comment', { cardId, content: 'great call' });
const commentEvent = await aliceSeesComment;
log('alice received comment_added; author =', commentEvent.comment.authorName);

const finalBoard = await getJson(`/api/boards/${board.id}`);
const cardInBad = finalBoard.columns.find((c) => c.id === badCol.id).cards.find((c) => c.id === cardId);
log('persisted: card moved to badCol =', !!cardInBad, '| comments =', cardInBad?.comments?.length);

const csv = await fetch(`${BASE}/api/boards/${board.id}/export`).then((r) => r.text());
log('csv export:\n' + csv);

alice.close();
bob.close();
log('done');
process.exit(0);
