import express from 'express';
import {
  boardAll, boardCreate, boardById, columnsByBoard,
  cardsByColumn, commentsByCard, columnCreate, boardExportData
} from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const boards = await boardAll();
  res.json(boards);
});

router.post('/', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const board = await boardCreate(title);
  res.status(201).json(board);
});

router.get('/:id', async (req, res) => {
  const board = await boardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const columns = await columnsByBoard(board.id);
  const columnsWithCards = await Promise.all(
    columns.map(async (col) => {
      const cards = await cardsByColumn(col.id);
      const cardsWithComments = await Promise.all(
        cards.map(async (card) => {
          const comments = await commentsByCard(card.id);
          return { ...card, comments };
        })
      );
      return { ...col, cards: cardsWithComments };
    })
  );

  res.json({ ...board, columns: columnsWithCards });
});

router.post('/:id/columns', async (req, res) => {
  const board = await boardById(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Column title is required' });

  const columns = await columnsByBoard(board.id);
  const column = await columnCreate(board.id, title, columns.length);
  res.status(201).json(column);
});

router.get('/:id/export', async (req, res) => {
  const result = await boardExportData(req.params.id);
  if (!result) return res.status(404).json({ error: 'Board not found' });

  const headers = ['board', 'column', 'card', 'card_author', 'comment', 'comment_author', 'created_at'];
  const csvRows = [headers.join(',')];

  for (const row of result.data) {
    const values = headers.map(h => {
      const val = String(row[h] ?? '');
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${result.board.title}-export.csv"`);
  res.send(csvRows.join('\n'));
});

export default router;
