-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activeGame" BOOLEAN NOT NULL DEFAULT false,
    "dealerId" INTEGER NOT NULL,
    CONSTRAINT "Game_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Card" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "suit" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "deckId" INTEGER,
    "dealerId" INTEGER,
    "playerId" INTEGER,
    CONSTRAINT "Card_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Card_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Card_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Dealer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT
);

-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "bet" INTEGER NOT NULL,
    "money" INTEGER NOT NULL,
    "gameId" INTEGER,
    CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_deckId_key" ON "Card"("deckId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_dealerId_key" ON "Card"("dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_playerId_key" ON "Card"("playerId");
