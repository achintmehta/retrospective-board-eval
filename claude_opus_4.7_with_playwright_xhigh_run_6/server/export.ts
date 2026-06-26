import { Router, type Request, type Response } from "express";
import { getBoard } from "./repo.js";

export const exportRouter = Router();

function escapeCsv(value: string): string {
  if (value == null) return "";
  const needsQuotes = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toCsvRow(values: string[]): string {
  return values.map(escapeCsv).join(",");
}

function sanitizeFilename(input: string): string {
  return input.replace(/[^a-z0-9\-_]+/gi, "_").slice(0, 80) || "board";
}

exportRouter.get("/boards/:id/export", (req: Request<{ id: string }>, res: Response) => {
  const board = getBoard(req.params.id);
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  const rows: string[] = [];
  rows.push(
    toCsvRow([
      "type",
      "column",
      "card_content",
      "card_author",
      "card_created_at",
      "comment_content",
      "comment_author",
      "comment_created_at",
    ]),
  );

  for (const column of board.columns) {
    if (column.cards.length === 0) {
      rows.push(
        toCsvRow(["column", column.title, "", "", "", "", "", ""]),
      );
      continue;
    }
    for (const card of column.cards) {
      rows.push(
        toCsvRow([
          "card",
          column.title,
          card.content,
          card.authorName,
          card.createdAt,
          "",
          "",
          "",
        ]),
      );
      for (const comment of card.comments) {
        rows.push(
          toCsvRow([
            "comment",
            column.title,
            card.content,
            card.authorName,
            card.createdAt,
            comment.content,
            comment.authorName,
            comment.createdAt,
          ]),
        );
      }
    }
  }

  const filename = `${sanitizeFilename(board.title)}-${board.id.slice(0, 8)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`,
  );
  res.send(rows.join("\r\n") + "\r\n");
});
