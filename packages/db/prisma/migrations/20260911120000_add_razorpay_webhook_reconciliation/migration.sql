-- AlterTable
ALTER TABLE `Payment`
    ADD COLUMN `providerOrderId` VARCHAR(191) NULL,
    ADD COLUMN `providerPaymentId` VARCHAR(191) NULL,
    ADD COLUMN `providerStatus` VARCHAR(80) NULL,
    ADD COLUMN `verifiedAt` DATETIME(3) NULL;

-- Backfill existing provider references used as Razorpay order ids.
UPDATE `Payment`
SET `providerOrderId` = `providerRef`
WHERE `provider` = 'razorpay'
  AND `providerRef` IS NOT NULL
  AND `providerOrderId` IS NULL;

-- AlterTable
ALTER TABLE `WebhookEvent` DROP INDEX `WebhookEvent_provider_providerId_key`;
ALTER TABLE `WebhookEvent` DROP INDEX `WebhookEvent_status_receivedAt_idx`;
ALTER TABLE `WebhookEvent`
    CHANGE COLUMN `providerId` `providerEventId` VARCHAR(191) NOT NULL,
    CHANGE COLUMN `status` `processingStatus` VARCHAR(40) NOT NULL,
    MODIFY COLUMN `lastError` VARCHAR(500) NULL,
    ADD COLUMN `eventName` VARCHAR(120) NULL,
    ADD COLUMN `paymentId` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NULL;

UPDATE `WebhookEvent`
SET `processingStatus` = CASE
    WHEN UPPER(`processingStatus`) IN ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED') THEN UPPER(`processingStatus`)
    WHEN UPPER(`processingStatus`) IN ('PENDING', 'PROCESSING') THEN 'RECEIVED'
    WHEN UPPER(`processingStatus`) IN ('SUCCESS', 'COMPLETED') THEN 'PROCESSED'
    ELSE 'FAILED'
END,
    `eventName` = COALESCE(NULLIF(`eventName`, ''), 'legacy.unknown'),
    `updatedAt` = COALESCE(`processedAt`, `receivedAt`, CURRENT_TIMESTAMP(3));

ALTER TABLE `WebhookEvent`
    MODIFY COLUMN `processingStatus` ENUM('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED') NOT NULL DEFAULT 'RECEIVED',
    MODIFY COLUMN `eventName` VARCHAR(120) NOT NULL,
    MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `WebhookEvent_provider_providerEventId_key` ON `WebhookEvent`(`provider`, `providerEventId`);

-- CreateIndex
CREATE INDEX `WebhookEvent_provider_eventName_receivedAt_idx` ON `WebhookEvent`(`provider`, `eventName`, `receivedAt`);

-- CreateIndex
CREATE INDEX `WebhookEvent_processingStatus_receivedAt_idx` ON `WebhookEvent`(`processingStatus`, `receivedAt`);

-- CreateIndex
CREATE INDEX `WebhookEvent_paymentId_receivedAt_idx` ON `WebhookEvent`(`paymentId`, `receivedAt`);

-- CreateIndex
CREATE UNIQUE INDEX `Payment_provider_providerOrderId_key` ON `Payment`(`provider`, `providerOrderId`);

-- CreateIndex
CREATE UNIQUE INDEX `Payment_provider_providerPaymentId_key` ON `Payment`(`provider`, `providerPaymentId`);

-- CreateIndex
CREATE INDEX `Payment_provider_status_updatedAt_idx` ON `Payment`(`provider`, `status`, `updatedAt`);

-- AddForeignKey
ALTER TABLE `WebhookEvent` ADD CONSTRAINT `WebhookEvent_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
