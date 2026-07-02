import { io } from 'socket.io-client';

const BASE = process.env.BASE || 'http://localhost:4001';

function req(path, method = 'GET', body) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${await r.text()}`);
    return r.json();
  });
}

async function main() {
  const health = await req('/api/health');
  console.log('health', health);

  const created = await req('/api/boards', 'POST', {
    title: 'E2E Smoke Board',
    columns: ['Good', 'Bad', 'Actions'],
  });
  const boardId = created.board.id;
  const goodColId = created.board.columns[0].id;
  const actionsColId = created.board.columns[2].id;
  console.log('board created', boardId);

  const socketA = io(BASE, { transports: ['websocket'] });
  const socketB = io(BASE, { transports: ['websocket'] });

  const wait = (s, event) =>
    new Promise((res) => s.once(event, (payload) => res(payload)));

  const emit = (s, event, payload) =>
    new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error(`${event} ack timeout`)), 3000);
      s.emit(event, payload, (ack) => {
        clearTimeout(timer);
        if (!ack || ack.ok === false) rej(new Error(ack?.error || 'ack error'));
        else res(ack);
      });
    });

  await new Promise((res) => socketA.on('connect', res));
  await new Promise((res) => socketB.on('connect', res));

  const joinA = await emit(socketA, 'join_board', { boardId, name: 'Alice' });
  const joinB = await emit(socketB, 'join_board', { boardId, name: 'Bob' });
  console.log('joined A/B, presence:', joinA.board.title, joinB.board.title);

  const bReceivesCard = wait(socketB, 'card_added');
  const addCard = await emit(socketA, 'add_card', {
    columnId: goodColId,
    content: 'Ship it!',
  });
  const relayed = await bReceivesCard;
  console.log('add_card broadcasted:', relayed.card.id === addCard.card.id ? 'OK' : 'MISMATCH');
  const cardId = addCard.card.id;

  const bReceivesMove = wait(socketB, 'card_moved');
  await emit(socketA, 'move_card', {
    cardId,
    targetColumnId: actionsColId,
    targetIndex: 0,
  });
  const move = await bReceivesMove;
  console.log('move_card broadcasted:', move.targetColumnId === actionsColId ? 'OK' : 'MISMATCH');

  const bReceivesComment = wait(socketB, 'comment_added');
  const addComment = await emit(socketA, 'add_comment', {
    cardId,
    content: 'Definitely, +1',
  });
  const comm = await bReceivesComment;
  console.log('add_comment broadcasted:', comm.comment.id === addComment.comment.id ? 'OK' : 'MISMATCH');

  const finalBoard = await req(`/api/boards/${boardId}`);
  const actionsCol = finalBoard.board.columns.find((c) => c.id === actionsColId);
  console.log('final: card moved to Actions?', actionsCol.cards[0]?.id === cardId ? 'OK' : 'MISMATCH');
  console.log('final: comment persisted?', actionsCol.cards[0]?.comments?.length === 1 ? 'OK' : 'MISMATCH');

  const csv = await fetch(`${BASE}/api/boards/${boardId}/export`).then((r) => r.text());
  const csvLines = csv.trim().split(/\r?\n/);
  console.log('csv lines:', csvLines.length, '(header + data)');

  socketA.disconnect();
  socketB.disconnect();
  console.log('SMOKE PASS');
  process.exit(0);
}

main().catch((err) => {
  console.error('SMOKE FAIL', err);
  process.exit(1);
});
