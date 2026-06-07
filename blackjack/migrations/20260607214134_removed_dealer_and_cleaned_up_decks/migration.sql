/*
  Warnings:

  - You are about to drop the `Dealer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `dealerId` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `playerId` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `dealerId` on the `Game` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Dealer";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Card" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "suit" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "deckId" INTEGER,
    "deckOrder" INTEGER,
    CONSTRAINT "Card_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Card" ("deckId", "deckOrder", "id", "score", "suit", "value") SELECT "deckId", "deckOrder", "id", "score", "suit", "value" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
CREATE TABLE "new_Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activeGame" BOOLEAN NOT NULL DEFAULT false,
    "sourceDeckId" INTEGER NOT NULL,
    "drawDeckId" INTEGER NOT NULL,
    "discardDeckId" INTEGER NOT NULL,
    CONSTRAINT "Game_sourceDeckId_fkey" FOREIGN KEY ("sourceDeckId") REFERENCES "Deck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_drawDeckId_fkey" FOREIGN KEY ("drawDeckId") REFERENCES "Deck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_discardDeckId_fkey" FOREIGN KEY ("discardDeckId") REFERENCES "Deck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("activeGame", "discardDeckId", "drawDeckId", "id", "sourceDeckId") SELECT "activeGame", "discardDeckId", "drawDeckId", "id", "sourceDeckId" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_sourceDeckId_key" ON "Game"("sourceDeckId");
CREATE UNIQUE INDEX "Game_drawDeckId_key" ON "Game"("drawDeckId");
CREATE UNIQUE INDEX "Game_discardDeckId_key" ON "Game"("discardDeckId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
