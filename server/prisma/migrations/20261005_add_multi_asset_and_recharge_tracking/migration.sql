-- AlterTable Asset
ALTER TABLE `Asset` 
    ADD COLUMN `modelNumber` VARCHAR(191) NULL,
    ADD COLUMN `location` VARCHAR(191) NULL,
    ADD COLUMN `simNumber` VARCHAR(191) NULL,
    ADD COLUMN `serviceProvider` VARCHAR(191) NULL,
    ADD COLUMN `planDetails` VARCHAR(191) NULL,
    ADD COLUMN `lastRechargeDate` DATETIME(3) NULL,
    ADD COLUMN `rechargeExpiryDate` DATETIME(3) NULL,
    ADD COLUMN `monthlyCost` DECIMAL(10, 2) NULL,
    ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `screenSize` VARCHAR(191) NULL,
    ADD COLUMN `inkCartridgeType` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Asset_location_idx` ON `Asset`(`location`);
CREATE INDEX `Asset_rechargeExpiryDate_idx` ON `Asset`(`rechargeExpiryDate`);

-- CreateTable RechargeHistory
CREATE TABLE `RechargeHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `validityDays` INTEGER NOT NULL DEFAULT 30,
    `rechargeDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `newExpiryDate` DATETIME(3) NOT NULL,
    `transactionId` VARCHAR(191) NULL,
    `paymentMode` VARCHAR(191) NULL DEFAULT 'UPI',
    `serviceProvider` VARCHAR(191) NULL,
    `planDetails` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RechargeHistory_assetId_idx`(`assetId`),
    INDEX `RechargeHistory_rechargeDate_idx`(`rechargeDate`),
    INDEX `RechargeHistory_newExpiryDate_idx`(`newExpiryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RechargeHistory` ADD CONSTRAINT `RechargeHistory_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RechargeHistory` ADD CONSTRAINT `RechargeHistory_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
