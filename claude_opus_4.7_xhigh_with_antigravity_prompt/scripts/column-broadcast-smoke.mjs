import { createRequire } from 'node:module';
const requireFromClient = createRequire(new URL('../client/package.json', import.meta.url));
const { io } = requireFromClient('socket.io-client');

const PORT = process.env.PORT || 4002;
const BASE = `http://localhost:${PORT}`;

const log = (...a) => console.log('[col-smoke]', ...a);

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

const board = await fetch(`${BASE}/api/boards`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Col broadcast ' + Date.now() }),
}).then((r) => r.json());
log('created board', board.id);

const alice = io(BASE, { transports: ['websocket'] });
const bob = io(BASE, { transports: ['websocket'] });

await Promise.all([
  new Promise((r) => alice.once('connect', r)),
  new Promise((r) => bob.once('connect', r)),
]);

await emit(alice, 'join_board', { boardId: board.id, displayName: 'Alice' });
await emit(bob, 'join_board', { boardId: board.id, displayName: 'Bob' });
log('both joined room');

const bobSeesColumn = once(bob, 'column_added', (p) => p.column?.title === 'Kudos');
await fetch(`${BASE}/api/boards/${board.id}/columns`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Kudos' }),
});
const evt = await bobSeesColumn;
log('bob received column_added; column id =', evt.column.id, 'title =', evt.column.title);

alice.close();
bob.close();
log('done');
process.exit(0);
