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
  created_at: string;
  position: number;
}

export interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface BoardWithChildren extends Board {
  columns: (BoardColumn & {
    cards: (Card & { comments: Comment[] })[];
  })[];
}
