import { io } from 'socket.io-client';

const BASE = process.env.BASE ?? 'http://localhost:3001';

async function main() {
  const boardsList = await (await fetch(`${BASE}/api/boards`)).json();
  const boardId = boardsList[0].id;
  const board = await (await fetch(`${BASE}/api/boards/${boardId}`)).json();
  const col1 = board.columns[0];
  const col2 = board.columns[1];
  console.log('board:', board.title, '| columns:', board.columns.length);

  const socket = io(BASE);
  await new Promise((r) => socket.once('connect', r));
  console.log('socket connected');

  const join = await new Promise((r) =>
    socket.emit('join_board', boardId, r)
  );
  console.log('join_board ack:', join);

  const cardAck = await new Promise((r) =>
    socket.emit(
      'add_card',
      {
        board_id: boardId,
        column_id: col1.id,
        content: 'Socket smoke card',
        author_name: 'SmokeBot',
      },
      r
    )
  );
  console.log('add_card ack:', cardAck.ok, cardAck.data?.id);

  const moveAck = await new Promise((r) =>
    socket.emit(
      'move_card',
      {
        board_id: boardId,
        card_id: cardAck.data.id,
        to_column_id: col2.id,
        to_position: 0,
      },
      r
    )
  );
  console.log('move_card ack:', moveAck.ok, 'new col:', moveAck.data?.column_id === col2.id);

  const cmtAck = await new Promise((r) =>
    socket.emit(
      'add_comment',
      {
        board_id: boardId,
        card_id: cardAck.data.id,
        content: 'Great point',
        author_name: 'SmokeBot',
      },
      r
    )
  );
  console.log('add_comment ack:', cmtAck.ok);

  socket.disconnect();

  const csv = await (await fetch(`${BASE}/api/boards/${boardId}/export`)).text();
  const lines = csv.split(/\r?\n/).filter(Boolean);
  console.log('csv lines:', lines.length);
  console.log('csv header:', lines[0]);
  console.log('csv sample:', lines[1]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
