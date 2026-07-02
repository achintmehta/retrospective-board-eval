import { io } from 'socket.io-client';

const BOARD_ID = process.argv[2];
if (!BOARD_ID) {
  console.error('usage: node scripts/smoke-socket.mjs <boardId>');
  process.exit(1);
}

const emit = (s, ev, p) =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: false, error: `${ev} timeout` }), 3000);
    s.emit(ev, p, (ack) => {
      clearTimeout(t);
      resolve(ack);
    });
  });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const alice = io('http://localhost:3001', { transports: ['websocket'] });
const bob = io('http://localhost:3001', { transports: ['websocket'] });
const heard = { a: [], b: [] };
['card_added', 'card_moved', 'comment_added', 'presence_update'].forEach((ev) => {
  alice.on(ev, (d) => heard.a.push([ev, d]));
  bob.on(ev, (d) => heard.b.push([ev, d]));
});

await new Promise((r) => alice.on('connect', r));
await new Promise((r) => bob.on('connect', r));
console.log('[smoke] connected');

const joinA = await emit(alice, 'join_board', { boardId: BOARD_ID, displayName: 'Alice' });
const joinB = await emit(bob, 'join_board', { boardId: BOARD_ID, displayName: 'Bob' });
console.log('[smoke] joins:', joinA.ok, joinB.ok);

if (!joinB.ok) process.exit(1);
const cols = joinB.board.columns;
const wellCol = cols[0].id;
const wipCol = cols[1].id;
await wait(100);

const addAck = await emit(alice, 'add_card', {
  columnId: wellCol,
  content: 'Ship a11y improvements!',
});
console.log('[smoke] add_card:', addAck.ok, addAck.card?.id);
await wait(150);

const cardId = addAck.card.id;
const moveAck = await emit(bob, 'move_card', {
  cardId,
  toColumnId: wipCol,
  toPosition: 0,
});
console.log('[smoke] move_card:', moveAck.ok);
await wait(150);

const cmt = await emit(bob, 'add_comment', { cardId, content: 'Huge for us.' });
console.log('[smoke] add_comment:', cmt.ok, cmt.comment?.id);
await wait(200);

console.log('[smoke] Alice heard:', heard.a.map(([e]) => e).join(','));
console.log('[smoke] Bob heard:  ', heard.b.map(([e]) => e).join(','));

alice.disconnect();
bob.disconnect();
process.exit(0);
