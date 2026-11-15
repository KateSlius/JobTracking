-- DropIndex
DROP INDEX "Reminder_dueAt_emailedAt_idx";

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "notifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "plannedAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "Reminder_dueAt_notifiedAt_idx" ON "Reminder"("dueAt", "notifiedAt");

-- CreateIndex
CREATE INDEX "Reminder_applicationId_idx" ON "Reminder"("applicationId");
