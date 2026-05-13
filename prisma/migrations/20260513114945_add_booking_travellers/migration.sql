-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "note" TEXT,
ADD COLUMN     "travellers" JSONB NOT NULL DEFAULT '[]';
