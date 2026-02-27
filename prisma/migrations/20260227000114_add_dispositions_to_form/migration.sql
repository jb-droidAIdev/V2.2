-- AlterTable
ALTER TABLE "MonitoringForm" ADD COLUMN     "dispositions" TEXT[] DEFAULT ARRAY[]::TEXT[];
