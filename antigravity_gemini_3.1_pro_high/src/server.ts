import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { initDb } from './db';
import * as models from './models';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

app.post('/api/boards', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const board = await models.createBoard(title);
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create board' });
  }
});

app.get('/api/boards', async (req, res) => {
  try {
    const boards = await models.getBoards();
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

app.get('/api/boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const board = await models.getBoardById(id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const columns = await models.getColumnsByBoardId(id);
    const cards = await models.getCardsByBoardId(id);
    const comments = await models.getCommentsByBoardId(id);

    res.json({ board, columns, cards, comments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch board details' });
  }
});

app.post('/api/boards/:id/columns', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, position } = req.body;
    if (!title || typeof position !== 'number') {
      return res.status(400).json({ error: 'Title and position are required' });
    }
    const column = await models.createColumn(id, title, position);
    res.json(column);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create column' });
  }
});

app.get('/api/boards/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const board = await models.getBoardById(id);
    if (!board) return res.status(404).send('Board not found');

    const columns = await models.getColumnsByBoardId(id);
    const cards = await models.getCardsByBoardId(id);
    const comments = await models.getCommentsByBoardId(id);

    const colMap = new Map(columns.map(c => [c.id, c.title]));
    
    let csv = 'Column,Card Content,Card Author,Comment Content,Comment Author\n';
    
    cards.forEach(card => {
      const cardComments = comments.filter(c => c.card_id === card.id);
      const colName = (colMap.get(card.column_id) || 'Unknown').replace(/"/g, '""');
      const cardContent = card.content.replace(/"/g, '""');
      const cardAuthor = card.author_name.replace(/"/g, '""');
      
      if (cardComments.length === 0) {
        csv += `"${colName}","${cardContent}","${cardAuthor}","",""\n`;
      } else {
        cardComments.forEach(comment => {
          const commentContent = comment.content.replace(/"/g, '""');
          const commentAuthor = comment.author_name.replace(/"/g, '""');
          csv += `"${colName}","${cardContent}","${cardAuthor}","${commentContent}","${commentAuthor}"\n`;
        });
      }
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="board-${id}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).send('Failed to export CSV');
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_board', (boardId) => {
    socket.join(boardId);
  });

  socket.on('add_card', async ({ boardId, columnId, content, authorName, position }) => {
    try {
      const card = await models.createCard(columnId, content, authorName, position);
      io.to(boardId).emit('card_added', card);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('move_card', async ({ boardId, cardId, newColumnId, newPosition }) => {
    try {
      await models.moveCard(cardId, newColumnId, newPosition);
      io.to(boardId).emit('card_moved', { cardId, newColumnId, newPosition });
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('add_comment', async ({ boardId, cardId, content, authorName }) => {
    try {
      const comment = await models.createComment(cardId, content, authorName);
      io.to(boardId).emit('comment_added', comment);
    } catch (e) {
      console.error(e);
    }
  });
});

// Serve static files in production
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get(/^(.*)$/, (req, res) => {
  // Ignore api routes for fallback
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;

async function start() {
  await initDb();
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
