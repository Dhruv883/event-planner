import prisma from "../../prisma";

type VoterPermission = "ALL_ATTENDEES" | "ACCEPTED_ATTENDEES" | "HOSTS_ONLY";
type ResultVisibility = "VISIBLE_TO_ALL" | "VISIBLE_TO_HOSTS_ONLY" | "VISIBLE_AFTER_VOTING" | "HIDDEN_UNTIL_CLOSED";

interface PollSettings {
  resultVisibility: string;
  voterPermission: string;
  allowMultipleSelections: boolean;
}

interface PollOption {
  id: string;
  text: string;
  order: number;
  _count: { responses: number };
}

interface PollResponse {
  pollOptionId: string;
}

interface PollWithDetails {
  id: string;
  title: string;
  description: string | null;
  status: string;
  settings: PollSettings | null;
  options: PollOption[];
  responses: PollResponse[];
}

export function isPollVisibleToUser(
  voterPermission: string | undefined,
  isHostOrCoHost: boolean,
  attendeeStatus: string | undefined
): boolean {
  if (isHostOrCoHost) return true;

  const permission = (voterPermission ?? "ALL_ATTENDEES") as VoterPermission;

  switch (permission) {
    case "HOSTS_ONLY":
      return false;
    case "ACCEPTED_ATTENDEES":
      return attendeeStatus === "ACCEPTED";
    default:
      return !!attendeeStatus;
  }
}

export function canUserSeeResultCounts(
  resultVisibility: string | undefined,
  isHostOrCoHost: boolean,
  hasVoted: boolean,
  isClosed: boolean
): boolean {
  const visibility = (resultVisibility ?? "VISIBLE_TO_ALL") as ResultVisibility;

  switch (visibility) {
    case "VISIBLE_TO_ALL":
      return true;
    case "VISIBLE_TO_HOSTS_ONLY":
      return isHostOrCoHost;
    case "VISIBLE_AFTER_VOTING":
      return hasVoted;
    case "HIDDEN_UNTIL_CLOSED":
      return isClosed;
    default:
      return false;
  }
}

export function formatPollResponse(poll: PollWithDetails, isHostOrCoHost: boolean) {
  const mySelections = poll.responses.map((r) => r.pollOptionId);
  const isClosed = poll.status !== "OPEN";
  const hasVoted = mySelections.length > 0;

  const canSeeCounts = canUserSeeResultCounts(
    poll.settings?.resultVisibility,
    isHostOrCoHost,
    hasVoted,
    isClosed
  );

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    status: poll.status,
    settings: poll.settings,
    options: poll.options.map((option) => ({
      id: option.id,
      text: option.text,
      order: option.order,
      count: canSeeCounts ? option._count.responses : undefined,
    })),
    mySelections,
  };
}

export async function checkVotingEligibility(
  voterPermission: string | undefined,
  isHostOrCoHost: boolean,
  eventId: string,
  userId: string
): Promise<string | null> {
  if (isHostOrCoHost) return null;

  const permission = voterPermission ?? "ALL_ATTENDEES";

  if (permission === "HOSTS_ONLY") {
    return "Voting restricted to hosts";
  }

  const attendee = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { status: true },
  });

  if (permission === "ACCEPTED_ATTENDEES") {
    if (!attendee || attendee.status !== "ACCEPTED") {
      return "Not eligible to vote";
    }
  } else if (!attendee) {
    return "Not invited to event";
  }

  return null;
}

export async function saveVotes(
  pollId: string,
  userId: string,
  optionIds: string[],
  allowMultiple: boolean
) {
  await prisma.$transaction(async (tx) => {
    if (allowMultiple) {
      // Remove deselected options, upsert selected ones
      await tx.pollResponse.deleteMany({
        where: { pollId, userId, NOT: { pollOptionId: { in: optionIds } } },
      });

      for (const optionId of optionIds) {
        await tx.pollResponse.upsert({
          where: { userId_pollOptionId: { userId, pollOptionId: optionId } },
          update: {},
          create: { pollId, pollOptionId: optionId, userId },
        });
      }
    } else {
      // Single selection: replace existing vote
      await tx.pollResponse.deleteMany({ where: { pollId, userId } });
      await tx.pollResponse.create({
        data: { pollId, pollOptionId: optionIds[0], userId },
      });
    }
  });
}
