/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `Poll` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CoHostInviteStatus" ADD VALUE 'REVOKED';
ALTER TYPE "CoHostInviteStatus" ADD VALUE 'REMOVED';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "requireApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Poll" DROP COLUMN "expiresAt";
