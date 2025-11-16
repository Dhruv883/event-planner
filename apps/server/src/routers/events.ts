import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  type: z.enum(["ONE_OFF", "WHOLE_DAY", "MULTI_DAY"]),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional().nullable(),
  coverImage: z.string().url(),
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const validation = createEventSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", details: validation.error.flatten() });
    }

    const {
      title,
      description,
      location,
      type,
      startDate,
      endDate,
      coverImage,
    } = validation.data;

    const startAt = new Date(startDate);
    const endAt = endDate ? new Date(endDate) : undefined;

    if (type === "ONE_OFF") {
      if (!endAt) {
        return res
          .status(400)
          .json({ error: "endDate is required for ONE_OFF events" });
      }
      if (endAt < startAt) {
        return res
          .status(400)
          .json({ error: "endDate must be after or equal to startDate" });
      }
    }

    if (type === "MULTI_DAY") {
      if (!endAt) {
        return res
          .status(400)
          .json({ error: "endDate is required for MULTI_DAY events" });
      }
      if (endAt < startAt) {
        return res
          .status(400)
          .json({ error: "endDate must be after or equal to startDate" });
      }
    }

    const startOfDayUTC = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const enumerateDaysInclusiveUTC = (from: Date, to: Date) => {
      const days: Date[] = [];
      let cursor = startOfDayUTC(from);
      const last = startOfDayUTC(to);
      while (cursor.getTime() <= last.getTime()) {
        days.push(new Date(cursor));
        cursor = new Date(cursor);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return days;
    };

    const createdEvent = await prisma.$transaction(async (tx) => {
      const eventRow = await tx.event.create({
        data: {
          title,
          description: description ?? undefined,
          location: location ?? undefined,
          type: type as any,
          startDate: startAt,
          endDate: endAt,
          coverImage: coverImage,
          hostId: req.user.id,
        },
        select: {
          id: true,
          title: true,
          type: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      });

      if (type === "WHOLE_DAY") {
        await tx.day.createMany({
          data: [
            {
              eventId: eventRow.id,
              date: startOfDayUTC(startAt),
            },
          ],
          skipDuplicates: true,
        });
      } else if (type === "MULTI_DAY" && endAt) {
        const dayDates = enumerateDaysInclusiveUTC(startAt, endAt).map((d) => ({
          eventId: eventRow.id,
          date: d,
        }));
        if (dayDates.length) {
          await tx.day.createMany({ data: dayDates, skipDuplicates: true });
        }
      }

      return eventRow;
    });

    return res.status(201).json({ data: createdEvent });
  } catch (err) {
    console.error("Create event error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        hostId: req.user.id,
      },
    });
    return res.status(200).json({ data: events });
  } catch (error) {
    console.error("Get events error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        days: {
          include: {
            activities: { orderBy: { startTime: "asc" } },
          },
          orderBy: { date: "asc" },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.hostId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(200).json({ data: event });
  } catch (error) {
    console.error("Get event by id error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const createActivitySchema = z.object({
  dayId: z.string().min(1),
  title: z.string().min(1),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

router.post("/:id/activities", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const parsed = createActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.hostId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const {
      dayId,
      title,
      startTime: startISO,
      endTime: endISO,
      location,
      description,
    } = parsed.data;

    const day = await prisma.day.findFirst({
      where: { id: dayId, eventId },
      select: { id: true, date: true },
    });
    if (!day) {
      return res.status(400).json({ error: "Invalid dayId for this event" });
    }

    const startTime = new Date(startISO);
    if (isNaN(startTime.getTime())) {
      return res.status(400).json({ error: "Invalid startTime" });
    }
    const dayUTC = day.date;
    const sameDay =
      startTime.getUTCFullYear() === dayUTC.getUTCFullYear() &&
      startTime.getUTCMonth() === dayUTC.getUTCMonth() &&
      startTime.getUTCDate() === dayUTC.getUTCDate();
    if (!sameDay) {
      return res
        .status(400)
        .json({ error: "startTime does not match dayId date" });
    }

    let endTime: Date | undefined = undefined;
    if (endISO) {
      endTime = new Date(endISO);
      if (isNaN(endTime.getTime())) {
        return res.status(400).json({ error: "Invalid endTime" });
      }
      if (endTime < startTime) {
        return res
          .status(400)
          .json({ error: "endTime must be after startTime" });
      }
    }

    const activity = await prisma.activity.create({
      data: {
        title,
        description: description ?? undefined,
        startTime,
        endTime: endTime,
        location: location ?? undefined,
        dayId: day.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        dayId: true,
      },
    });

    return res.status(201).json({ data: activity });
  } catch (err) {
    console.error("Create activity error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/activities/:activityId", requireAuth, async (req, res) => {
  try {
    const { id: eventId, activityId } = req.params as {
      id: string;
      activityId: string;
    };
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        day: { select: { event: { select: { hostId: true, id: true } } } },
      },
    });
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    if (activity.day.event.id !== eventId) {
      return res
        .status(400)
        .json({ error: "Activity does not belong to event" });
    }
    if (activity.day.event.hostId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.activity.delete({ where: { id: activityId } });
    return res.status(204).send();
  } catch (err) {
    console.error("Delete activity error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------- Polls ----------------
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

router.post("/:id/polls", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
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

router.get("/:id/polls", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;

    // Determine requester role vis-a-vis event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, coHosts: { select: { id: true } } },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    const isHost = event.hostId === req.user.id;
    const isCoHost = event.coHosts.some((c) => c.id === req.user.id);
    const isHostOrCoHost = isHost || isCoHost;

    // If not host/cohost, user must at least be invited to the event
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
      // ALL_ATTENDEES
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

const voteSchema = z.object({ optionIds: z.array(z.string().min(1)).min(1) });

// Update poll (status, expiresAt, settings)
router.patch("/:id/polls/:pollId", requireAuth, async (req, res) => {
  try {
    const { id: eventId, pollId } = req.params as {
      id: string;
      pollId: string;
    };
    // Do not allow updating settings post-creation
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
      // Update basic fields
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

      // Settings update disabled intentionally

      return pollUpdate;
    });

    return res.status(200).json({ data: updated });
  } catch (err) {
    console.error("Update poll error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/polls/:pollId/vote", requireAuth, async (req, res) => {
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

    // Load poll with settings and event info for permissions
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

    // Check poll status (manual closing only)
    if (poll.status !== "OPEN") {
      return res.status(400).json({ error: "Poll is closed" });
    }

    const isHost = poll.event.hostId === req.user.id;
    const isCoHost = poll.event.coHosts.some((c) => c.id === req.user.id);

    // Voter permission enforcement
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

    // Validate optionIds belong to poll
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
        // Remove existing votes on this poll by this user
        await tx.pollResponse.deleteMany({
          where: { pollId, userId: req.user.id },
        });
        // Create the single vote
        await tx.pollResponse.create({
          data: {
            pollId,
            pollOptionId: optionIds[0],
            userId: req.user.id,
          },
        });
      } else {
        // For multiple selections, set the exact selection
        await tx.pollResponse.deleteMany({
          where: {
            pollId,
            userId: req.user.id,
            NOT: { pollOptionId: { in: optionIds } },
          },
        });
        // Upsert for each selected option (composite id)
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

// ---------------- Co-host Invites & Co-host management ----------------
const inviteByEmailSchema = z.object({ email: z.string().email() });

// Create co-host invite (host only)
router.post("/:id/cohosts/invite", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const parsed = inviteByEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const email = parsed.data.email.toLowerCase();

    const event: any = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        hostId: true,
        coHosts: { select: { id: true, email: true } },
      } as any,
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if ((event as any).hostId !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });

    if (event.coHosts.some((c: any) => c.email?.toLowerCase() === email)) {
      return res.status(400).json({ error: "User already a co-host" });
    }

    const hostEmail = await prisma.user.findUnique({
      where: { id: event.hostId },
      select: { email: true },
    });
    if (hostEmail?.email?.toLowerCase() === email) {
      return res.status(400).json({ error: "Host is already managing" });
    }

    const existingInvite = await (prisma as any).coHostInvite.findFirst({
      where: { eventId, invitedEmail: email, status: "PENDING" },
    });
    if (existingInvite) {
      return res.status(200).json({ data: existingInvite, reused: true });
    }

    const invitedUser = await prisma.user.findFirst({ where: { email } });

    const invite = await (prisma as any).coHostInvite.create({
      data: {
        eventId,
        inviterId: req.user.id,
        invitedEmail: email,
        invitedUserId: invitedUser?.id,
      },
      select: {
        id: true,
        eventId: true,
        invitedEmail: true,
        invitedUserId: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ data: invite });
  } catch (err) {
    console.error("Create cohost invite error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// List co-hosts and invites for an event (host only)
router.get("/:id/cohosts/invites", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        hostId: true,
        coHosts: { select: { id: true, name: true, email: true } },
      } as any,
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if ((event as any).hostId !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });

    const invites = await (prisma as any).coHostInvite.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invitedEmail: true,
        invitedUserId: true,
        status: true,
        createdAt: true,
        respondedAt: true,
      },
    });

    return res.status(200).json({ data: { coHosts: event.coHosts, invites } });
  } catch (err) {
    console.error("List cohost invites error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Accept invite (invitee)
router.post(
  "/:id/cohosts/invites/:inviteId/accept",
  requireAuth,
  async (req, res) => {
    try {
      const { id: eventId, inviteId } = req.params as {
        id: string;
        inviteId: string;
      };
      const invite = await (prisma as any).coHostInvite.findUnique({
        where: { id: inviteId },
      });
      if (!invite || invite.eventId !== eventId)
        return res.status(404).json({ error: "Invite not found" });
      if (invite.status !== "PENDING")
        return res.status(400).json({ error: "Invite not pending" });

      if (invite.invitedUserId && invite.invitedUserId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!invite.invitedUserId) {
        const me = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (
          !me ||
          me.email.toLowerCase() !== invite.invitedEmail.toLowerCase()
        ) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        const upd = await (tx as any).coHostInvite.update({
          where: { id: inviteId },
          data: {
            status: "ACCEPTED",
            respondedAt: new Date(),
            invitedUserId: invite.invitedUserId || req.user.id,
          },
          select: { id: true, status: true },
        });
        await tx.event.update({
          where: { id: eventId },
          data: { coHosts: { connect: { id: req.user.id } } },
        });
        return upd;
      });

      return res.status(200).json({ data: updated });
    } catch (err) {
      console.error("Accept cohost invite error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Decline invite (invitee)
router.post(
  "/:id/cohosts/invites/:inviteId/decline",
  requireAuth,
  async (req, res) => {
    try {
      const { id: eventId, inviteId } = req.params as {
        id: string;
        inviteId: string;
      };
      const invite = await (prisma as any).coHostInvite.findUnique({
        where: { id: inviteId },
      });
      if (!invite || invite.eventId !== eventId)
        return res.status(404).json({ error: "Invite not found" });
      if (invite.status !== "PENDING")
        return res.status(400).json({ error: "Invite not pending" });
      if (invite.invitedUserId && invite.invitedUserId !== req.user.id)
        return res.status(403).json({ error: "Forbidden" });
      if (!invite.invitedUserId) {
        const me = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (
          !me ||
          me.email.toLowerCase() !== invite.invitedEmail.toLowerCase()
        ) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
      const updated = await (prisma as any).coHostInvite.update({
        where: { id: inviteId },
        data: {
          status: "DECLINED",
          respondedAt: new Date(),
          invitedUserId: invite.invitedUserId || req.user.id,
        },
        select: { id: true, status: true },
      });
      return res.status(200).json({ data: updated });
    } catch (err) {
      console.error("Decline cohost invite error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Revoke invite (host only)
router.post(
  "/:id/cohosts/invites/:inviteId/revoke",
  requireAuth,
  async (req, res) => {
    try {
      const { id: eventId, inviteId } = req.params as {
        id: string;
        inviteId: string;
      };
      const invite = await (prisma as any).coHostInvite.findUnique({
        where: { id: inviteId },
      });
      if (!invite || invite.eventId !== eventId)
        return res.status(404).json({ error: "Invite not found" });
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { hostId: true },
      });
      if (!event) return res.status(404).json({ error: "Event not found" });
      if (event.hostId !== req.user.id)
        return res.status(403).json({ error: "Forbidden" });
      if (invite.status !== "PENDING")
        return res
          .status(400)
          .json({ error: "Cannot revoke non-pending invite" });
      await (prisma as any).coHostInvite.update({
        where: { id: inviteId },
        data: { status: "REVOKED", respondedAt: new Date() },
      });
      return res.status(204).send();
    } catch (err) {
      console.error("Revoke cohost invite error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Remove co-host (host only)
router.delete("/:id/cohosts/:userId", requireAuth, async (req, res) => {
  try {
    const { id: eventId, userId } = req.params as {
      id: string;
      userId: string;
    };
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, coHosts: { select: { id: true, email: true } } },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.hostId !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });
    if (userId === event.hostId)
      return res.status(400).json({ error: "Cannot remove host" });
    if (!event.coHosts.some((c) => c.id === userId))
      return res.status(404).json({ error: "User not a co-host" });
    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: { coHosts: { disconnect: { id: userId } } },
      });
      // Mark the latest accepted invite for this user as REMOVED for visibility in their invites list
      const latestAccepted = await (tx as any).coHostInvite.findFirst({
        where: { eventId, invitedUserId: userId, status: "ACCEPTED" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (latestAccepted) {
        await (tx as any).coHostInvite.update({
          where: { id: latestAccepted.id },
          data: { status: "REMOVED", respondedAt: new Date() },
        });
      }
    });
    return res.status(204).send();
  } catch (err) {
    console.error("Remove cohost error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cohosts/invite/me", requireAuth, async (req, res) => {
  try {
    const emailUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true },
    });
    if (!emailUser) return res.status(401).json({ error: "Unauthorized" });
    const email = emailUser.email.toLowerCase();
    const invites = await (prisma as any).coHostInvite.findMany({
      where: {
        invitedEmail: email,
        status: {
          in: ["PENDING", "ACCEPTED", "DECLINED", "REVOKED", "REMOVED"],
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invitedEmail: true,
        invitedUserId: true,
        status: true,
        createdAt: true,
        respondedAt: true,
        event: {
          select: { id: true, title: true, coverImage: true, startDate: true },
        },
        inviter: { select: { id: true, name: true, email: true } },
      },
    });
    return res.status(200).json({ data: invites });
  } catch (err) {
    console.error("List my invites error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
