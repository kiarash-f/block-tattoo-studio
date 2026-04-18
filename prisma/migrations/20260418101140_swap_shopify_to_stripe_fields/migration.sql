/*
  Warnings:

  - You are about to drop the column `shopifyDraftOrderId` on the `GuestArtistBooking` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyInvoiceUrl` on the `GuestArtistBooking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GuestArtistBooking" DROP COLUMN "shopifyDraftOrderId",
DROP COLUMN "shopifyInvoiceUrl",
ADD COLUMN     "stripePaymentUrl" TEXT,
ADD COLUMN     "stripeSessionId" TEXT;
