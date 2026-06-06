/*
  Warnings:

  - Added the required column `discardDeckId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `drawDeckId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceDeckId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Made the column `gameId` on table `Player` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Card_playerId_key";

-- DropIndex
DROP INDEX "Card_dealerId_key";

-- DropIndex
DROP INDEX "Card_deckId_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activeGame" BOOLEAN NOT NULL DEFAULT false,
    "sourceDeckId" INTEGER NOT NULL,
    "drawDeckId" INTEGER NOT NULL,
    "discardDeckId" INTEGER NOT NULL,
    "dealerId" INTEGER NOT NULL,
    CONSTRAINT "Game_sourceDeckId_fkey" FOREIGN KEY ("sourceDeckId") REFERENCES "Deck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_drawDeckId_fkey" FOREIGN KEY ("drawDeckId") REFERENCES "Deck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_discardDeckId_fkey" FOREIGN KEY ("discardDeckId") REFERENCES "Deck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("activeGame", "dealerId", "id") SELECT "activeGame", "dealerId", "id" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_sourceDeckId_key" ON "Game"("sourceDeckId");
CREATE UNIQUE INDEX "Game_drawDeckId_key" ON "Game"("drawDeckId");
CREATE UNIQUE INDEX "Game_discardDeckId_key" ON "Game"("discardDeckId");
CREATE UNIQUE INDEX "Game_dealerId_key" ON "Game"("dealerId");
CREATE TABLE "new_Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "bet" INTEGER NOT NULL,
    "money" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("bet", "gameId", "id", "money", "name") SELECT "bet", "gameId", "id", "money", "name" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
