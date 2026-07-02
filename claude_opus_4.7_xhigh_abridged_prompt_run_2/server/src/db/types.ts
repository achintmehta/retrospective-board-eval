export interface BoardRow {
  id: string;
  title: string;
  created_at: number;
}

export interface BoardColumnRow {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: number;
}

export interface CardRow {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  position: number;
  created_at: number;
}

export interface CommentRow {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: number;
}

export interface Card extends CardRow {
  comments: CommentRow[];
}

export interface BoardColumn extends BoardColumnRow {
  cards: Card[];
}

export interface BoardWithChildren extends BoardRow {
  columns: BoardColumn[];
}
