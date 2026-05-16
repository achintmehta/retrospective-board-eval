// @ts-nocheck

// Types for the Realtime Retro Board application

/** A board in the system */
export interface Board {
  id: string;
  title: string;
  createdAt: string;
}

/** A column within a board */
export interface BoardColumn {
  id: string;
  boardId: string;
  title: string;
  position: number;
}

/** A card on a board */
export interface Card {
  id: string;
  columnId: string;
  content: string;
  authorName: string;
  createdAt: string;
  position: number;
}

/** A comment on a card */
export interface Comment {
  id: string;
  cardId: string;
  content: string;
  authorName: string;
  createdAt: string;
}
