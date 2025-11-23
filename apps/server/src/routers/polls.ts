import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

const router = express.Router({ mergeParams: true });

const pollSettingsSchema = z.object({
  allowMultipleSelections: z.boolean().optional(),
  voterPermission: z
    .enum(["ALL_ATTENDEES", "ACCEPTED_ATTENDEES", "HOSTS_ONLY"])
    .optional(),
  resultVisibility: z
    .enum([
      "VISIBLE_TO_ALL",
      "VISIBLE_TO_HOSTS_ONLY",
      "VISIBLE_AFTER_VOTING",
      "HIDDEN_UNTIL_CLOSED",
    ])
    .optional(),
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

router.post("/", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id as string;
    const parsed = createPollSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const { allowed } = await isHostOrCoHost(eventId, req.user.id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const { title, description, options, settings } = parsed.data;
    const created = await prisma.$transaction(async (tx) => {
      const poll = await tx.poll.create({
        data: {
          title,
          description: description ?? undefined,
          eventId,
          creatorId: req.user.id,
          settings: {
            create: {
              allowMultipleSelections:
                settings?.allowMultipleSelections ?? false,
              voterPermission: (settings?.voterPermission ??
                "ALL_ATTENDEES") as any,
              resultVisibility: (settings?.resultVisibility ??
                "VISIBLE_TO_ALL") as any,
            },
          },
        },
        select: { id: true },
      });

      await tx.pollOption.createMany({
        data: options.map((text, idx) => ({
          text,
          order: idx,
          pollId: poll.id,
        })),
      });
      return poll;
    });

    return res.status(201).json({ data: created });
  } catch (err) {
    console.error("Create poll error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id as string;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, coHosts: { select: { id: true } } },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    const isHost = event.hostId === req.user.id;
    const isCoHost = event.coHosts.some((c) => c.id === req.user.id);
    const isHostOrCoHost = isHost || isCoHost;

    let attendee: { status: string } | null = null;
    if (!isHostOrCoHost) {
      attendee = await prisma.eventAttendee.findUnique({
        where: { eventId_userId: { eventId, userId: req.user.id } },
        select: { status: true },
      });
      if (!attendee)
        return res.status(403).json({ error: "Not invited to event" });
    }

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
          where: { userId: req.user.id },
          select: { pollOptionId: true },
        },
      },
    });

    const visibleToUser = (voterPermission: string) => {
      if (isHostOrCoHost) return true;
      if (voterPermission === "HOSTS_ONLY") return false;
      if (voterPermission === "ACCEPTED_ATTENDEES")
        return attendee?.status === "ACCEPTED";
      return !!attendee;
    };

    const mapped = polls
      .filter((p) =>
        visibleToUser(p.settings?.voterPermission ?? "ALL_ATTENDEES")
      )
      .map((p) => {
        const mySelections = p.responses.map((r) => r.pollOptionId);
        const isClosed = p.status !== "OPEN";
        const vis = p.settings?.resultVisibility ?? "VISIBLE_TO_ALL";
        const canSeeCounts =
          vis === "VISIBLE_TO_ALL" ||
          (vis === "VISIBLE_TO_HOSTS_ONLY" && isHostOrCoHost) ||
          (vis === "VISIBLE_AFTER_VOTING" && mySelections.length > 0) ||
          (vis === "HIDDEN_UNTIL_CLOSED" && isClosed);

        return {
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          settings: p.settings,
          options: p.options.map((o) => ({
            id: o.id,
            text: o.text,
            order: o.order,
            count: canSeeCounts ? o._count.responses : undefined,
          })),
          mySelections,
        };
      });

    return res.status(200).json({ data: mapped });
  } catch (err) {
    console.error("List polls error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:pollId", requireAuth, async (req, res) => {
  try {
    const { id: eventId, pollId } = req.params as {
      id: string;
      pollId: string;
    };
    if (typeof (req.body as any)?.settings !== "undefined") {
      return res
        .status(400)
        .json({ error: "Updating poll settings is not allowed" });
    }
    const parsed = updatePollSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const { allowed } = await isHostOrCoHost(eventId, req.user.id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { id: true, eventId: true },
    });
    if (!poll || poll.eventId !== eventId)
      return res.status(404).json({ error: "Poll not found" });

    const { title, description, status } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const pollUpdate = await tx.poll.update({
        where: { id: pollId },
        data: {
          title,
          description:
            description === undefined ? undefined : (description ?? null),
          status: status as any,
        },
        select: { id: true },
      });

      return pollUpdate;
    });

    return res.status(200).json({ data: updated });
  } catch (err) {
    console.error("Update poll error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:pollId/vote", requireAuth, async (req, res) => {
  try {
    const { id: eventId, pollId } = req.params as {
      id: string;
      pollId: string;
    };
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { optionIds } = parsed.data;

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        event: {
          select: { id: true, hostId: true, coHosts: { select: { id: true } } },
        },
        settings: true,
        options: { select: { id: true } },
      },
    });
    if (!poll || poll.eventId !== eventId)
      return res.status(404).json({ error: "Poll not found" });

    if (poll.status !== "OPEN") {
      return res.status(400).json({ error: "Poll is closed" });
    }

    const isHost = poll.event.hostId === req.user.id;
    const isCoHost = poll.event.coHosts.some((c) => c.id === req.user.id);

    const voter = poll.settings?.voterPermission ?? ("ALL_ATTENDEES" as any);
    if (!isHost && !isCoHost) {
      if (voter === "HOSTS_ONLY") {
        return res.status(403).json({ error: "Voting restricted to hosts" });
      }
      if (voter === "ACCEPTED_ATTENDEES") {
        const attendee = await prisma.eventAttendee.findUnique({
          where: { eventId_userId: { eventId, userId: req.user.id } },
          select: { status: true },
        });
        if (!attendee || attendee.status !== "ACCEPTED") {
          return res.status(403).json({ error: "Not eligible to vote" });
        }
      } else if (voter === "ALL_ATTENDEES") {
        const attendee = await prisma.eventAttendee.findUnique({
          where: { eventId_userId: { eventId, userId: req.user.id } },
          select: { status: true },
        });
        if (!attendee) {
          return res.status(403).json({ error: "Not invited to event" });
        }
      }
    }

    const validOptionIds = new Set(poll.options.map((o) => o.id));
    if (!optionIds.every((id) => validOptionIds.has(id))) {
      return res.status(400).json({ error: "Invalid option selection" });
    }

    const multiple = !!poll.settings?.allowMultipleSelections;
    if (!multiple && optionIds.length !== 1) {
      return res.status(400).json({ error: "Multiple selections not allowed" });
    }

    await prisma.$transaction(async (tx) => {
      if (!multiple) {
        await tx.pollResponse.deleteMany({
          where: { pollId, userId: req.user.id },
        });
        await tx.pollResponse.create({
          data: {
            pollId,
            pollOptionId: optionIds[0],
            userId: req.user.id,
          },
        });
      } else {
        await tx.pollResponse.deleteMany({
          where: {
            pollId,
            userId: req.user.id,
            NOT: { pollOptionId: { in: optionIds } },
          },
        });
        for (const oid of optionIds) {
          await tx.pollResponse.upsert({
            where: {
              userId_pollOptionId: { userId: req.user.id, pollOptionId: oid },
            },
            update: {},
            create: { pollId, pollOptionId: oid, userId: req.user.id },
          });
        }
      }
    });

    return res.status(204).send();
  } catch (err) {
    console.error("Vote poll error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
