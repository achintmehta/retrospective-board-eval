## ADDED Requirements

### Requirement: Guest Authentication
The system MUST require users to enter a display name when joining a board session before they can interact with the board.

#### Scenario: User joins board
- **WHEN** the user navigates to a board URL
- **THEN** the system prompts them for a display name if one is not already set in their session

### Requirement: Real-time Card Management
The system MUST allow users to add cards to columns and move cards between columns, broadcasting these changes to all connected clients instantly.

#### Scenario: User adds a card
- **WHEN** a user adds a card to a column
- **THEN** the card is immediately visible to all other users viewing the same board

#### Scenario: User moves a card
- **WHEN** a user drags and drops a card to a different column
- **THEN** the card's new position is instantly updated on all connected clients

### Requirement: Nested Comments
The system MUST allow users to add comments or replies to specific cards.

#### Scenario: User comments on a card
- **WHEN** a user adds a comment to an existing card
- **THEN** the comment is saved with their display name and broadcasted to all connected clients
