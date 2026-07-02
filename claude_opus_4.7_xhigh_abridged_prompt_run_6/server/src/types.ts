export type Board = {
  id: string;
  title: string;
  created_at: number;
};

export type BoardColumn = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  accent: string;
};

export type Card = {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  position: number;
  created_at: number;
};

export type Comment = {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: number;
};

export type BoardWithChildren = Board & {
  columns: (BoardColumn & {
    cards: (Card & { comments: Comment[] })[];
  })[];
};
