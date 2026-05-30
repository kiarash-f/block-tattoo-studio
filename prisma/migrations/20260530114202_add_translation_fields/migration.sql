-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "contentDe" TEXT,
ADD COLUMN     "contentEn" TEXT,
ADD COLUMN     "excerptDe" TEXT,
ADD COLUMN     "excerptEn" TEXT,
ADD COLUMN     "titleDe" TEXT,
ADD COLUMN     "titleEn" TEXT;

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "bioDe" TEXT,
ADD COLUMN     "bioEn" TEXT;

-- AlterTable
ALTER TABLE "ArtistWork" ADD COLUMN     "titleDe" TEXT,
ADD COLUMN     "titleEn" TEXT;
