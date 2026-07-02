/*
 * Smoke test: exercises REST + Socket.io end-to-end.
 * Run against a live server on port 4000.
 */
import { io } from 'socket.io-client';

async function j(path, opts) {
  const res = await fetch(`http://localhost:4000${path}`, opts);
  if (!res.ok) throw new Error(`${path} => ${res.status}`);
  return res.json();
}

const emit = (socket, event, payload) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${event} timed out`)), 4000);
    socket.emit(event, payload, (ack) => {
      clearTimeout(timeout);
      resolve(ack);
    });
  });

async function main() {
  // Create board via REST
  const created = await j('/api/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Smoke Test Board' }),
  });
  const boardId = created.board.id;
  console.log('Created board', boardId);

  const column = created.board.columns[0];
  const secondColumn = created.board.columns[1];

  const clientA = io('http://localhost:4000', { transports: ['websocket'] });
  const clientB = io('http://localhost:4000', { transports: ['websocket'] });

  await Promise.all([
    new Promise((r) => clientA.on('connect', r)),
    new Promise((r) => clientB.on('connect', r)),
  ]);
  console.log('Both clients connected');

  const ackA = await emit(clientA, 'join_board', { boardId, displayName: 'Alex' });
  const ackB = await emit(clientB, 'join_board', { boardId, displayName: 'Blake' });
  if (!ackA.ok || !ackB.ok) throw new Error('join failed');
  console.log('Both joined');

  // Listen for broadcasts on B while A performs actions
  const events = [];
  clientB.on('card_added', (p) => events.push({ t: 'card_added', p }));
  clientB.on('card_moved', (p) => events.push({ t: 'card_moved', p }));
  clientB.on('comment_added', (p) => events.push({ t: 'comment_added', p }));
  clientB.on('column_added', (p) => events.push({ t: 'column_added', p }));

  const addAck = await emit(clientA, 'add_card', {
    columnId: column.id,
    content: 'Hello from A',
  });
  if (!addAck.ok) throw new Error('add_card failed');
  const cardId = addAck.card.id;
  console.log('add_card ok', cardId);

  const moveAck = await emit(clientA, 'move_card', {
    cardId,
    toColumnId: secondColumn.id,
    toIndex: 0,
  });
  if (!moveAck.ok) throw new Error('move_card failed');
  console.log('move_card ok');

  const commentAck = await emit(clientA, 'add_comment', {
    cardId,
    content: 'Great idea',
  });
  if (!commentAck.ok) throw new Error('add_comment failed');
  console.log('add_comment ok');

  const colAck = await emit(clientA, 'add_column', { title: 'Kudos' });
  if (!colAck.ok) throw new Error('add_column failed');
  console.log('add_column ok');

  await new Promise((r) => setTimeout(r, 500));

  console.log('Broadcasts received by B:', events.map((e) => e.t));
  const kinds = new Set(events.map((e) => e.t));
  ['card_added', 'card_moved', 'comment_added', 'column_added'].forEach((k) => {
    if (!kinds.has(k)) throw new Error(`Missing broadcast: ${k}`);
  });

  // Verify CSV export
  const csv = await fetch(`http://localhost:4000/api/boards/${boardId}/export`).then((r) =>
    r.text(),
  );
  console.log('CSV first lines:');
  console.log(csv.split('\n').slice(0, 4).join('\n'));

  clientA.close();
  clientB.close();
  console.log('\nSMOKE OK');
}

main().catch((err) => {
  console.error('SMOKE FAILED', err);
  process.exit(1);
});
