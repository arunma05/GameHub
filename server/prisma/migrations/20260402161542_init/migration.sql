-- CreateTable
CREATE TABLE "Result" (
    "id" SERIAL NOT NULL,
    "gameType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "time" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WinCount" (
    "id" SERIAL NOT NULL,
    "gameType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WinCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SudokuSave" (
    "id" SERIAL NOT NULL,
    "playerName" TEXT NOT NULL,
    "puzzle" TEXT NOT NULL,
    "current" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "timeElapsed" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SudokuSave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WinCount_gameType_name_key" ON "WinCount"("gameType", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SudokuSave_playerName_key" ON "SudokuSave"("playerName");
