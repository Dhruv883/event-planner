-- CreateEnum
CREATE TYPE "public"."CoHostInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "public"."CoHostInvite" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "invitedUserId" TEXT,
    "status" "public"."CoHostInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "CoHostInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoHostInvite_eventId_invitedEmail_key" ON "public"."CoHostInvite"("eventId", "invitedEmail");

-- AddForeignKey
ALTER TABLE "public"."CoHostInvite" ADD CONSTRAINT "CoHostInvite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoHostInvite" ADD CONSTRAINT "CoHostInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoHostInvite" ADD CONSTRAINT "CoHostInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
