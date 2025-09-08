-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('ONE_OFF', 'WHOLE_DAY', 'MULTI_DAY');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('PLANNING', 'UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AttendeeStatus" AS ENUM ('INVITED', 'ACCEPTED', 'PENDING', 'DECLINED');

-- CreateEnum
CREATE TYPE "public"."PollStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."PollVoter" AS ENUM ('ALL_ATTENDEES', 'ACCEPTED_ATTENDEES', 'HOSTS_ONLY');

-- CreateEnum
CREATE TYPE "public"."PollResultVisibility" AS ENUM ('VISIBLE_TO_ALL', 'VISIBLE_TO_HOSTS_ONLY', 'VISIBLE_AFTER_VOTING', 'HIDDEN_UNTIL_CLOSED');

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "type" "public"."EventType" NOT NULL,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hostId" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventAttendee" (
    "status" "public"."AttendeeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EventAttendee_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "public"."Day" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dayId" TEXT NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Poll" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."PollStatus" NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3),
    "eventId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PollOption" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "pollId" TEXT NOT NULL,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PollResponse" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "pollOptionId" TEXT NOT NULL,

    CONSTRAINT "PollResponse_pkey" PRIMARY KEY ("userId","pollOptionId")
);

-- CreateTable
CREATE TABLE "public"."PollSettings" (
    "id" TEXT NOT NULL,
    "allowMultipleSelections" BOOLEAN NOT NULL DEFAULT false,
    "voterPermission" "public"."PollVoter" NOT NULL DEFAULT 'ALL_ATTENDEES',
    "resultVisibility" "public"."PollResultVisibility" NOT NULL DEFAULT 'VISIBLE_TO_ALL',
    "pollId" TEXT NOT NULL,

    CONSTRAINT "PollSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_EventCoHosts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventCoHosts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Day_eventId_date_key" ON "public"."Day"("eventId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PollSettings_pollId_key" ON "public"."PollSettings"("pollId");

-- CreateIndex
CREATE INDEX "_EventCoHosts_B_index" ON "public"."_EventCoHosts"("B");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttendee" ADD CONSTRAINT "EventAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttendee" ADD CONSTRAINT "EventAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Day" ADD CONSTRAINT "Day_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "public"."Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Poll" ADD CONSTRAINT "Poll_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Poll" ADD CONSTRAINT "Poll_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollResponse" ADD CONSTRAINT "PollResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollResponse" ADD CONSTRAINT "PollResponse_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollResponse" ADD CONSTRAINT "PollResponse_pollOptionId_fkey" FOREIGN KEY ("pollOptionId") REFERENCES "public"."PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollSettings" ADD CONSTRAINT "PollSettings_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_EventCoHosts" ADD CONSTRAINT "_EventCoHosts_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_EventCoHosts" ADD CONSTRAINT "_EventCoHosts_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
