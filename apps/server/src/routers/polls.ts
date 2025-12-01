import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireEventMember, requireHostOrCoHost } from "@/middleware/event-auth";
import { isPollVisibleToUser, formatPollResponse, checkVotingEligibility, saveVotes } from "@/lib/poll-helpers";

const router = express.Router({ mergeParams: true });

const voterPermissionEnum = z.enum(["ALL_ATTENDEES", "ACCEPTED_ATTENDEES", "HOSTS_ONLY"]);
const resultVisibilityEnum = z.enum([
  "VISIBLE_TO_ALL",
  "VISIBLE_TO_HOSTS_ONLY",
  "VISIBLE_AFTER_VOTING",
  "HIDDEN_UNTIL_CLOSED",
]);

const pollSettingsSchema = z.object({
  allowMultipleSelections: z.boolean().optional(),
  voterPermission: voterPermissionEnum.optional(),
  resultVisibility: resultVisibilityEnum.optional(),
});

const createPollSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  options: z.array(z.string().min(1)).min(1, "At least one option required"),
  settings: pollSettingsSchema.optional(),
});

const updatePollSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
});

const voteSchema = z.object({ optionIds: z.array(z.string().min(1)).min(1) });

async function isHostOrCoHost(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { hostId: true, coHosts: { select: { id: true } } },
  });
  if (!event) return { allowed: false, event: null as any };
  const isHost = event.hostId === userId;
  const isCoHost = event.coHosts.some((c) => c.id === userId);
  return { allowed: isHost || isCoHost, event } as const;
}

// Create a new poll for an event
router.post("/", requireAuth, requireHostOrCoHost, async (req, res) => {
  try {
    const eventId = req.event!.id;

    const parsedBody = createPollSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid body", details: parsedBody.error.flatten() });
    }

    const { title, description, options, settings } = parsedBody.data;

    const pollOptions = options.map((text, index) => ({ text, order: index }));

    const newPoll = await prisma.poll.create({
      data: {
        title,
        description,
        eventId,
        creatorId: req.user.id,
        settings: { create: settings },
        options: { createMany: { data: pollOptions } },
      },
      select: { id: true },
    });

    return res.status(201).json({ data: newPoll });
  } catch (err) {
    console.error("Create poll error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all polls for an event
router.get("/", requireAuth, requireEventMember, async (req, res) => {
  try {
    const eventId = req.event!.id;
    const userId = req.user.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, coHosts: { select: { id: true } } },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isHostOrCoHost = event.hostId === userId || event.coHosts.some((c) => c.id === userId);

    const attendee = await prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    });

    const polls = await prisma.poll.findMany({
      where: { eventId },
      orderBy: { id: "desc" },
      include: {
        options: {
          orderBy: { order: "asc" },
          include: { _count: { select: { responses: true } } },
        },
        settings: true,
        responses: {
          where: { userId },
          select: { pollOptionId: true },
        },
      },
    });

    const visiblePolls = polls
      .filter((poll) => isPollVisibleToUser(poll.settings?.voterPermission, isHostOrCoHost, attendee?.status))
      .map((poll) => formatPollResponse(poll, isHostOrCoHost));

    return res.status(200).json({ data: visiblePolls });
  } catch (err) {
    console.error("List polls error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update a poll
router.patch("/:pollId", requireAuth, requireHostOrCoHost, async (req, res) => {
  try {
    const { pollId } = req.params;
    const eventId = req.event!.id;

    if (req.body?.settings !== undefined) {
      return res.status(400).json({ error: "Updating poll settings is not allowed" });
    }

    const parsed = updatePollSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { eventId: true },
    });

    if (!poll || poll.eventId !== eventId) {
      return res.status(404).json({ error: "Poll not found" });
    }

    const { title, description, status } = parsed.data;

    const updatedPoll = await prisma.poll.update({
      where: { id: pollId },
      data: {
        title,
        description: description,
        status: status,
      },
      select: { id: true },
    });

    return res.status(200).json({ data: updatedPoll });
  } catch (err) {
    console.error("Update poll error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Vote in a poll
router.post("/:pollId/vote", requireAuth, requireEventMember, async (req, res) => {
  try {
    const { pollId } = req.params;
    const eventId = req.event!.id;
    const userId = req.user.id;

    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const { optionIds } = parsed.data;

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        event: { select: { hostId: true, coHosts: { select: { id: true } } } },
        settings: true,
        options: { select: { id: true } },
      },
    });

    if (!poll || poll.eventId !== eventId) {
      return res.status(404).json({ error: "Poll not found" });
    }

    if (poll.status !== "OPEN") {
      return res.status(400).json({ error: "Poll is closed" });
    }

    const isHostOrCoHost = poll.event.hostId === userId || poll.event.coHosts.some((c) => c.id === userId);

    const eligibilityError = await checkVotingEligibility(
      poll.settings?.voterPermission,
      isHostOrCoHost,
      eventId,
      userId
    );
    if (eligibilityError) {
      return res.status(403).json({ error: eligibilityError });
    }

    const validOptionIds = new Set(poll.options.map((option) => option.id));
    if (!optionIds.every((id) => validOptionIds.has(id))) {
      return res.status(400).json({ error: "Invalid option selection" });
    }

    const allowMultiple = poll.settings?.allowMultipleSelections ?? false;
    if (!allowMultiple && optionIds.length !== 1) {
      return res.status(400).json({ error: "Multiple selections not allowed" });
    }

    await saveVotes(pollId, userId, optionIds, allowMultiple);

    return res.status(204).send();
  } catch (err) {
    console.error("Vote poll error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
