export interface Board {
  id: string;
  title: string;
  created_at: string;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  title: string;
  position: number;
}

export interface Card {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  position: number;
  created_at: string;
}

export interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface FullBoard extends Board {
  columns: (BoardColumn & {
    cards: (Card & { comments: Comment[] })[];
  })[];
}
