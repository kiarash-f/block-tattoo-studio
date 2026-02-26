/*
  Warnings:

  - You are about to drop the column `coverImageUrl` on the `ArtistWork` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `ArtistWork` table. All the data in the column will be lost.
  - You are about to drop the `ArtistWorkTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Artist` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `coverUrl` to the `ArtistWork` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `ArtistWork` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ArtistWork" DROP CONSTRAINT "ArtistWork_artistId_fkey";

-- DropForeignKey
ALTER TABLE "ArtistWorkTag" DROP CONSTRAINT "ArtistWorkTag_artistWorkId_fkey";

-- DropForeignKey
ALTER TABLE "ArtistWorkTag" DROP CONSTRAINT "ArtistWorkTag_tagId_fkey";

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "ArtistWork" DROP COLUMN "coverImageUrl",
DROP COLUMN "description",
ADD COLUMN     "coverUrl" TEXT NOT NULL,
ADD COLUMN     "tags" TEXT[],
ALTER COLUMN "title" SET NOT NULL;

-- DropTable
DROP TABLE "ArtistWorkTag";

-- DropTable
DROP TABLE "Tag";

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");

-- CreateIndex
CREATE INDEX "Artist_slug_idx" ON "Artist"("slug");

-- CreateIndex
CREATE INDEX "ArtistWork_tags_idx" ON "ArtistWork"("tags");

-- AddForeignKey
ALTER TABLE "ArtistWork" ADD CONSTRAINT "ArtistWork_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
