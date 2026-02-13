/*
  Warnings:

  - The values [200_400,400_700,700_1000,1000_1500,1500_2000] on the enum `BudgetRange` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BudgetRange_new" AS ENUM ('UNDER_200', 'B200_400', 'B400_700', 'B700_1000', 'B1000_1500', 'B1500_2000', 'OVER_2000');
ALTER TABLE "BookingRequest" ALTER COLUMN "budgetRange" TYPE "BudgetRange_new" USING ("budgetRange"::text::"BudgetRange_new");
ALTER TYPE "BudgetRange" RENAME TO "BudgetRange_old";
ALTER TYPE "BudgetRange_new" RENAME TO "BudgetRange";
DROP TYPE "public"."BudgetRange_old";
COMMIT;
