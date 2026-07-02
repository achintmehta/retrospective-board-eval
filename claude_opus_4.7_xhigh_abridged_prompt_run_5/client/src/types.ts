export type Board = {
  id: string;
  title: string;
  created_at: number;
};

export type Column = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: number;
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

export type CardWithComments = Card & { comments: Comment[] };
export type ColumnWithCards = Column & { cards: CardWithComments[] };
export type BoardDetail = Board & { columns: ColumnWithCards[] };
