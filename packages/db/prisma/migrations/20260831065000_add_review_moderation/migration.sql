ALTER TABLE `Review`
  ADD COLUMN `highlights` JSON NULL,
  ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'HIDDEN', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `showOnHomepage` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `moderatedById` VARCHAR(191) NULL,
  ADD COLUMN `moderatedAt` DATETIME(3) NULL,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `Review`
  ADD CONSTRAINT `Review_moderatedById_fkey`
  FOREIGN KEY (`moderatedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX `Review_bookingId_key` ON `Review`(`bookingId`);
CREATE INDEX `Review_status_showOnHomepage_createdAt_idx` ON `Review`(`status`, `showOnHomepage`, `createdAt`);
CREATE INDEX `Review_customerProfileId_createdAt_idx` ON `Review`(`customerProfileId`, `createdAt`);
