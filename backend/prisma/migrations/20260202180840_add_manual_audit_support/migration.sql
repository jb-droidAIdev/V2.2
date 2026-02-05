-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_sampledTicketId_fkey";

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "ticketReference" TEXT,
ALTER COLUMN "sampledTicketId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_sampledTicketId_fkey" FOREIGN KEY ("sampledTicketId") REFERENCES "SampledTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
