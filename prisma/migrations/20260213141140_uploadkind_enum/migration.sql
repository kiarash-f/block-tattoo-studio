/*
  Warnings:

  - Changed the type of `kind` on the `Upload` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UploadKind" AS ENUM ('REFERENCE', 'MEDICAL', 'OTHER');

-- AlterTable
ALTER TABLE "Upload" DROP COLUMN "kind",
ADD COLUMN     "kind" "UploadKind" NOT NULL;
