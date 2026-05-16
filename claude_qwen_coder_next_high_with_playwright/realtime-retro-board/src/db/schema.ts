// @ts-nocheck

const db = require('./database');

function initSchema() {
  // Create boards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create board_columns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS board_columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    )
  `);

  // Create cards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL DEFAULT 'Anonymous',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
    )
  `);

  // Create comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL DEFAULT 'Anonymous',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_board_columns_board ON board_columns(board_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id)
  `);

  console.log('Database schema initialized successfully');
}

// Initialize schema on module load
initSchema();

module.exports = { initSchema };
