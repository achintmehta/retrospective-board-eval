## ADDED Requirements

### Requirement: Create a Retro Board
The system MUST allow users to create a new retrospective board by specifying a title. Upon creation, the board MUST be assigned a unique identifier.

#### Scenario: User creates a board
- **WHEN** the user submits a new board name
- **THEN** the system creates the board and navigates the user to the new board's URL

### Requirement: List Boards
The system MUST display a list of all created retrospective boards on the main page, sorted by creation date.

#### Scenario: User views main page
- **WHEN** the user navigates to the root URL
- **THEN** the system displays all existing boards

### Requirement: Configure Columns
The system MUST allow users to define and reorder columns (e.g., "Went Well", "Needs Improvement") for a specific board.

#### Scenario: User adds a column
- **WHEN** the user adds a new column name within a board
- **THEN** the column is saved and immediately visible to all users in the board
