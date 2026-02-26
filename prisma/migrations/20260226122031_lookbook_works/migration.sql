-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistWork" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "ArtistWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistWorkTag" (
    "artistWorkId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ArtistWorkTag_pkey" PRIMARY KEY ("artistWorkId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "ArtistWork_status_createdAt_idx" ON "ArtistWork"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ArtistWork_artistId_createdAt_idx" ON "ArtistWork"("artistId", "createdAt");

-- CreateIndex
CREATE INDEX "ArtistWorkTag_tagId_idx" ON "ArtistWorkTag"("tagId");

-- AddForeignKey
ALTER TABLE "ArtistWork" ADD CONSTRAINT "ArtistWork_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistWorkTag" ADD CONSTRAINT "ArtistWorkTag_artistWorkId_fkey" FOREIGN KEY ("artistWorkId") REFERENCES "ArtistWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistWorkTag" ADD CONSTRAINT "ArtistWorkTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
