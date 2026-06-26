export type Comment = {
  id: string;
  cardId: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export type Card = {
  id: string;
  columnId: string;
  content: string;
  authorName: string;
  position: number;
  createdAt: string;
  comments: Comment[];
};

export type BoardColumn = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
  cards: Card[];
};

export type BoardSummary = {
  id: string;
  title: string;
  createdAt: string;
};

export type BoardDetail = BoardSummary & {
  columns: BoardColumn[];
};
