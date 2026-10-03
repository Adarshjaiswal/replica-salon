ALTER TABLE `Service`
  ADD COLUMN `dealEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `dealPricePaise` INTEGER NULL,
  ADD COLUMN `dealStartsAt` DATETIME(3) NULL,
  ADD COLUMN `dealEndsAt` DATETIME(3) NULL;

CREATE INDEX `Service_dealEnabled_dealStartsAt_dealEndsAt_idx`
  ON `Service`(`dealEnabled`, `dealStartsAt`, `dealEndsAt`);
