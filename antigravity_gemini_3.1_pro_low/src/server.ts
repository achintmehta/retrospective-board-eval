import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { db, run, query, get } from './db';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// 3.1 Create Board
app.post('/api/boards', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    
    const id = crypto.randomUUID();
    await run('INSERT INTO boards (id, title) VALUES (?, ?)', [id, title]);
    res.json({ id, title });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.2 Fetch all boards
app.get('/api/boards', async (req, res) => {
  try {
    const boards = await query('SELECT * FROM boards ORDER BY created_at DESC');
    res.json(boards);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.3 Fetch specific board
app.get('/api/boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const board = await get('SELECT * FROM boards WHERE id = ?', [id]);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    
    const columns = await query('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC', [id]);
    const cards = await query(`
      SELECT c.* FROM cards c
      JOIN board_columns bc ON c.column_id = bc.id
      WHERE bc.board_id = ?
      ORDER BY c.position ASC
    `, [id]);
    
    const cardIds = cards.map(c => c.id);
    let comments: any[] = [];
    if (cardIds.length > 0) {
      const placeholders = cardIds.map(() => '?').join(',');
      comments = await query(`SELECT * FROM comments WHERE card_id IN (${placeholders}) ORDER BY created_at ASC`, cardIds);
    }
    
    res.json({ ...board, columns, cards, comments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.4 Create board columns
app.post('/api/boards/:id/columns', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, position } = req.body;
    if (!title || position === undefined) return res.status(400).json({ error: 'Title and position are required' });
    
    const columnId = crypto.randomUUID();
    await run('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)', [columnId, id, title, position]);
    res.json({ id: columnId, board_id: id, title, position });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7.1 Export Board to CSV
app.get('/api/boards/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const board = await get('SELECT * FROM boards WHERE id = ?', [id]);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    
    const cards = await query(`
      SELECT c.*, bc.title as column_title FROM cards c
      JOIN board_columns bc ON c.column_id = bc.id
      WHERE bc.board_id = ?
    `, [id]);
    
    let csv = 'Card ID,Column,Content,Author,Created At\n';
    for (const card of cards) {
      csv += `"${card.id}","${card.column_title}","${card.content.replace(/"/g, '""')}","${card.author_name}","${card.created_at}"\n`;
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="board-${id}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.io for Real-Time (Section 5)
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join_board', (boardId) => {
    socket.join(boardId);
    console.log(`Socket ${socket.id} joined board ${boardId}`);
  });
  
  socket.on('add_card', async ({ boardId, columnId, content, authorName, position }) => {
    const id = crypto.randomUUID();
    await run('INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)', [id, columnId, content, authorName, position]);
    const newCard = await get('SELECT * FROM cards WHERE id = ?', [id]);
    io.to(boardId).emit('card_added', newCard);
  });
  
  socket.on('move_card', async ({ boardId, cardId, newColumnId, newPosition }) => {
    await run('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [newColumnId, newPosition, cardId]);
    io.to(boardId).emit('card_moved', { cardId, newColumnId, newPosition });
  });
  
  socket.on('add_comment', async ({ boardId, cardId, content, authorName }) => {
    const id = crypto.randomUUID();
    await run('INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)', [id, cardId, content, authorName]);
    const newComment = await get('SELECT * FROM comments WHERE id = ?', [id]);
    io.to(boardId).emit('comment_added', newComment);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Fallback for React Router (must be after all API routes)
// Express 5+ requires valid path-to-regexp patterns. Using app.use is the safest catch-all.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
