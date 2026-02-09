/*
  Warnings:

  - You are about to drop the `AuditView` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AuditView" DROP CONSTRAINT "AuditView_auditId_fkey";

-- DropForeignKey
ALTER TABLE "AuditView" DROP CONSTRAINT "AuditView_userId_fkey";

-- DropTable
DROP TABLE "AuditView";

-- CreateTable
CREATE TABLE "AuditUserView" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditUserView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditUserView_auditId_userId_key" ON "AuditUserView"("auditId", "userId");

-- AddForeignKey
ALTER TABLE "AuditUserView" ADD CONSTRAINT "AuditUserView_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditUserView" ADD CONSTRAINT "AuditUserView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
