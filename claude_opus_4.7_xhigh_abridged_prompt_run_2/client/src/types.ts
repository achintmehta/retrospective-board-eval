export interface BoardSummary {
  id: string;
  title: string;
  created_at: number;
}

export interface CommentRow {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: number;
}

export interface CardRow {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  position: number;
  created_at: number;
  comments: CommentRow[];
}

export interface BoardColumnRow {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: number;
  cards: CardRow[];
}

export interface BoardWithChildren extends BoardSummary {
  columns: BoardColumnRow[];
}
