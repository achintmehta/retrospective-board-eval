export interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: number;
}

export interface Card {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  created_at: number;
  position: number;
  comments: Comment[];
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  cards: Card[];
}

export interface Board {
  id: string;
  title: string;
  created_at: number;
  columns: Column[];
}

export interface BoardSummary {
  id: string;
  title: string;
  created_at: number;
}
