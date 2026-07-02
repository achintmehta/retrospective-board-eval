import { io } from 'socket.io-client';

const BASE = process.env.BASE ?? 'http://localhost:4123';

const boardResp = await fetch(`${BASE}/api/boards`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Socket Smoke Test' }),
});
const board = await boardResp.json();
console.log('Created board', board.id);

const full = await (await fetch(`${BASE}/api/boards/${board.id}`)).json();
const wentWell = full.columns.find((c) => c.title === 'Went Well');
const needsImprovement = full.columns.find((c) => c.title === 'Needs Improvement');

const clientA = io(BASE, { transports: ['websocket'] });
const clientB = io(BASE, { transports: ['websocket'] });

const received = { A: [], B: [] };
['card_added', 'card_moved', 'comment_added', 'column_added'].forEach((evt) => {
  clientA.on(evt, (p) => received.A.push({ evt, p }));
  clientB.on(evt, (p) => received.B.push({ evt, p }));
});

async function join(client, name) {
  return new Promise((resolve, reject) => {
    client.emit('join_board', { boardId: board.id, displayName: name }, (resp) => {
      if (resp?.error) reject(new Error(resp.error));
      else resolve(resp);
    });
  });
}

const joinA = await join(clientA, 'Alice');
const joinB = await join(clientB, 'Bob');
console.log('Both joined. Board columns:', joinA.board.columns.length);

async function emit(client, evt, payload) {
  return new Promise((resolve) => client.emit(evt, payload, resolve));
}

const cardA = await emit(clientA, 'add_card', {
  boardId: board.id,
  columnId: wentWell.id,
  content: 'Deployment pipeline is 3x faster',
  authorName: 'Alice',
});
console.log('add_card ack:', cardA);

await new Promise((r) => setTimeout(r, 100));

const move = await emit(clientA, 'move_card', {
  boardId: board.id,
  cardId: cardA.card.id,
  targetColumnId: needsImprovement.id,
  targetIndex: 0,
});
console.log('move_card ack:', move);

await new Promise((r) => setTimeout(r, 100));

const comment = await emit(clientB, 'add_comment', {
  boardId: board.id,
  cardId: cardA.card.id,
  content: 'Kudos to the release team!',
  authorName: 'Bob',
});
console.log('add_comment ack:', comment);

await new Promise((r) => setTimeout(r, 200));

console.log('Client A received:', received.A.map((e) => e.evt));
console.log('Client B received:', received.B.map((e) => e.evt));

const finalBoard = await (await fetch(`${BASE}/api/boards/${board.id}`)).json();
const cardInBoard = finalBoard.columns
  .flatMap((c) => c.cards.map((cd) => ({ column: c.title, card: cd })))
  .find((row) => row.card.content.startsWith('Deployment'));

console.log('Final card location:', cardInBoard?.column, 'comments:', cardInBoard?.card.comments.length);

const csv = await (await fetch(`${BASE}/api/boards/${board.id}/export`)).text();
console.log('CSV:\n' + csv);

clientA.disconnect();
clientB.disconnect();

if (received.A.length < 3 || received.B.length < 3) {
  console.error('FAIL: expected each client to receive card_added, card_moved, comment_added');
  process.exit(1);
}
if (cardInBoard?.column !== 'Needs Improvement') {
  console.error('FAIL: card should have moved to Needs Improvement, but is in', cardInBoard?.column);
  process.exit(1);
}
if (cardInBoard?.card.comments.length !== 1) {
  console.error('FAIL: expected 1 comment, got', cardInBoard?.card.comments.length);
  process.exit(1);
}

console.log('\nOK — all socket flows verified.');
process.exit(0);
