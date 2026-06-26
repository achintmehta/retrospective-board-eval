import { Router } from 'express';
import {
  createBoard,
  listBoards,
  getBoard,
  createColumn
} from '../repository.js';

export function createBoardRouter() {
  const router = Router();

  // 3.2 List all boards
  router.get('/', (req, res) => {
    try {
      const boards = listBoards();
      res.json({ boards });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3.1 Create a new board
  router.post('/', (req, res) => {
    try {
      const { title, columns } = req.body || {};
      const board = createBoard(title, columns);
      res.status(201).json({ board });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // 3.3 Fetch a specific board with full state
  router.get('/:id', (req, res) => {
    try {
      const board = getBoard(req.params.id);
      if (!board) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }
      res.json({ board });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3.4 Create a column inside a board
  router.post('/:id/columns', (req, res) => {
    try {
      const { title } = req.body || {};
      const column = createColumn(req.params.id, title);
      res.status(201).json({ column });
    } catch (err) {
      const status = err.message === 'Board not found' ? 404 : 400;
      res.status(status).json({ error: err.message });
    }
  });

  return router;
}
