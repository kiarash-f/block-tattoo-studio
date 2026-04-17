-- AlterEnum
ALTER TYPE "GuestBookingStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "GuestArtistBooking" ADD COLUMN     "shopifyDraftOrderId" TEXT,
ADD COLUMN     "shopifyInvoiceUrl" TEXT;
