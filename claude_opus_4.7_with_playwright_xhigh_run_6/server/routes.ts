import { Router, type Request, type Response } from "express";
import {
  createBoard,
  createColumn,
  getBoard,
  listBoards,
  listCommentsForCard,
} from "./repo.js";

export const apiRouter = Router();

apiRouter.get("/boards", (_req: Request, res: Response) => {
  res.json(listBoards());
});

apiRouter.post("/boards", (req: Request, res: Response) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  if (title.length > 200) {
    res.status(400).json({ error: "Title is too long" });
    return;
  }
  const board = createBoard(title);
  res.status(201).json(board);
});

apiRouter.get("/boards/:id", (req: Request<{ id: string }>, res: Response) => {
  const board = getBoard(req.params.id);
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  res.json(board);
});

apiRouter.post("/boards/:id/columns", (req: Request<{ id: string }>, res: Response) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  if (title.length > 100) {
    res.status(400).json({ error: "Title is too long" });
    return;
  }
  try {
    const column = createColumn(req.params.id, title);
    res.status(201).json(column);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(404).json({ error: message });
  }
});

apiRouter.get("/cards/:id/comments", (req: Request<{ id: string }>, res: Response) => {
  res.json(listCommentsForCard(req.params.id));
});
