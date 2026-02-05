/*
  Warnings:

  - A unique constraint covering the columns `[eid]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[systemId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "billable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "eid" TEXT,
ADD COLUMN     "employeeTeam" TEXT,
ADD COLUMN     "manager" TEXT,
ADD COLUMN     "projectCode" TEXT,
ADD COLUMN     "sdm" TEXT,
ADD COLUMN     "supervisor" TEXT,
ADD COLUMN     "systemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_eid_key" ON "User"("eid");

-- CreateIndex
CREATE UNIQUE INDEX "User_systemId_key" ON "User"("systemId");
