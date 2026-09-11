-- CreateTable
CREATE TABLE `ServiceTier` (
    `id` VARCHAR(191) NOT NULL,
    `publicId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `tierType` ENUM('PREMIUM', 'LUXURY') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NULL,
    `durationMinutes` INTEGER NULL,
    `pricePaise` INTEGER NOT NULL,
    `compareAtPricePaise` INTEGER NULL,
    `productsUsed` JSON NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceTier_publicId_key`(`publicId`),
    UNIQUE INDEX `ServiceTier_serviceId_tierType_key`(`serviceId`, `tierType`),
    INDEX `ServiceTier_serviceId_status_idx`(`serviceId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServicePackage` (
    `id` VARCHAR(191) NOT NULL,
    `publicId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `description` VARCHAR(700) NULL,
    `minPricePaise` INTEGER NOT NULL,
    `compareAtPricePaise` INTEGER NULL,
    `discountBps` INTEGER NOT NULL DEFAULT 0,
    `durationMinutes` INTEGER NOT NULL,
    `inclusions` JSON NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServicePackage_publicId_key`(`publicId`),
    UNIQUE INDEX `ServicePackage_slug_key`(`slug`),
    INDEX `ServicePackage_categoryId_status_sortOrder_idx`(`categoryId`, `status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServicePackageItem` (
    `id` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `serviceTierId` VARCHAR(191) NULL,
    `label` VARCHAR(180) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `minQuantity` INTEGER NOT NULL DEFAULT 1,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ServicePackageItem_packageId_sortOrder_idx`(`packageId`, `sortOrder`),
    INDEX `ServicePackageItem_serviceId_idx`(`serviceId`),
    INDEX `ServicePackageItem_serviceTierId_idx`(`serviceTierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffService` (
    `staffProfileId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StaffService_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`staffProfileId`, `serviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `BookingItem`
  ADD COLUMN `serviceTierId` VARCHAR(191) NULL,
  ADD COLUMN `packageId` VARCHAR(191) NULL,
  ADD COLUMN `serviceTierName` VARCHAR(120) NULL,
  ADD COLUMN `packageName` VARCHAR(180) NULL;

-- CreateIndex
CREATE INDEX `BookingItem_serviceTierId_idx` ON `BookingItem`(`serviceTierId`);
CREATE INDEX `BookingItem_packageId_idx` ON `BookingItem`(`packageId`);

-- AddForeignKey
ALTER TABLE `ServiceTier`
  ADD CONSTRAINT `ServiceTier_serviceId_fkey`
  FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServicePackage`
  ADD CONSTRAINT `ServicePackage_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServicePackageItem`
  ADD CONSTRAINT `ServicePackageItem_packageId_fkey`
  FOREIGN KEY (`packageId`) REFERENCES `ServicePackage`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServicePackageItem`
  ADD CONSTRAINT `ServicePackageItem_serviceId_fkey`
  FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServicePackageItem`
  ADD CONSTRAINT `ServicePackageItem_serviceTierId_fkey`
  FOREIGN KEY (`serviceTierId`) REFERENCES `ServiceTier`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffService`
  ADD CONSTRAINT `StaffService_staffProfileId_fkey`
  FOREIGN KEY (`staffProfileId`) REFERENCES `StaffProfile`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffService`
  ADD CONSTRAINT `StaffService_serviceId_fkey`
  FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingItem`
  ADD CONSTRAINT `BookingItem_serviceTierId_fkey`
  FOREIGN KEY (`serviceTierId`) REFERENCES `ServiceTier`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingItem`
  ADD CONSTRAINT `BookingItem_packageId_fkey`
  FOREIGN KEY (`packageId`) REFERENCES `ServicePackage`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
