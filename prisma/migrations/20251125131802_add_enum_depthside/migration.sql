/*
  Warnings:

  - Changed the type of `side` on the `market_depth` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MarketDepthSide" AS ENUM ('BID', 'ASK');

-- AlterTable
ALTER TABLE "market_depth" DROP COLUMN "side",
ADD COLUMN     "side" "MarketDepthSide" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "market_depth_symbol_side_level_key" ON "market_depth"("symbol", "side", "level");
