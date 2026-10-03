-- AlterTable
ALTER TABLE `Allocation` ADD COLUMN `expectedReturnDate` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Allocation_expectedReturnDate_idx` ON `Allocation`(`expectedReturnDate`);
