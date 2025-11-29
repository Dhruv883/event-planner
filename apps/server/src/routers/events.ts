import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import activitiesRouter from "./activities";
import pollsRouter from "./polls";
import cohostsRouter from "./cohosts";

const router = express.Router();

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  type: z.enum(["ONE_OFF", "WHOLE_DAY", "MULTI_DAY"]),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional().nullable(),
  coverImage: z.string().url(),
  requireApproval: z.boolean().optional().default(false),
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
      requireApproval,
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
          requireApproval,
          hostId: req.user.id,
        },
        select: {
          id: true,
          title: true,
          type: true,
          startDate: true,
          endDate: true,
          status: true,
          requireApproval: true,
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
        OR: [
          { hostId: req.user.id },
          { coHosts: { some: { id: req.user.id } } },
          { attendees: { some: { userId: req.user.id } } },
        ],
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
        coHosts: true,
        attendees: true,
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

    const isHost = event.hostId === req.user.id;
    const isCoHost = event.coHosts?.some((u) => u.id === req.user.id);
    const isAttendee = event.attendees?.some((a) => a.userId === req.user.id);

    if (!isHost && !isCoHost && !isAttendee) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(200).json({ data: event });
  } catch (error) {
    console.error("Get event by id error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Lightweight preview info for public event page and join logic
router.get("/:id/preview", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        location: true,
        hostId: true,
        requireApproval: true,
        attendees: {
          select: {
            userId: true,
            status: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const existing = event.attendees.find((a) => a.userId === req.user.id);

    return res.status(200).json({
      data: {
        ...event,
        myAttendeeStatus: existing?.status ?? null,
        isHost: event.hostId === req.user.id,
      },
    });
  } catch (error) {
    console.error("Get event preview error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Join an event as attendee (with optional approval)
router.post("/:id/join", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        hostId: true,
        requireApproval: true,
        attendees: {
          where: { userId: req.user.id },
          select: { status: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.hostId === req.user.id) {
      return res
        .status(400)
        .json({ error: "Host is already part of the event" });
    }

    const existing = event.attendees[0];
    if (existing?.status === "ACCEPTED") {
      return res
        .status(200)
        .json({ data: { status: "ACCEPTED" as const }, reused: true });
    }
    if (existing?.status === "PENDING") {
      return res
        .status(200)
        .json({ data: { status: "PENDING" as const }, reused: true });
    }

    const status = event.requireApproval ? "PENDING" : "ACCEPTED";

    const attendee = await prisma.eventAttendee.upsert({
      where: {
        eventId_userId: {
          eventId: id,
          userId: req.user.id,
        },
      },
      update: { status },
      create: {
        eventId: id,
        userId: req.user.id,
        status,
      },
      select: {
        eventId: true,
        userId: true,
        status: true,
      },
    });

    return res.status(200).json({ data: attendee });
  } catch (error) {
    console.error("Join event error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// List pending attendees for an event (host & cohosts only)
router.get("/:id/attendees/pending", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        hostId: true,
        coHosts: { select: { id: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isHost = event.hostId === req.user.id;
    const isCoHost = event.coHosts.some((c) => c.id === req.user.id);
    if (!isHost && !isCoHost) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const pending = await prisma.eventAttendee.findMany({
      where: { eventId: id, status: "PENDING" },
      select: {
        eventId: true,
        userId: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({ data: pending });
  } catch (error) {
    console.error("List pending attendees error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Full attendee listing (host & cohosts). Shows all statuses.
router.get("/:id/attendees", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        hostId: true,
        requireApproval: true,
        coHosts: { select: { id: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isHost = event.hostId === req.user.id;
    const isCoHost = event.coHosts.some((c) => c.id === req.user.id);
    if (!isHost && !isCoHost) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: id },
      select: {
        eventId: true,
        userId: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const groups = attendees.reduce(
      (acc: any, a) => {
        acc[a.status.toLowerCase()]?.push(a);
        return acc;
      },
      { pending: [] as any[], accepted: [] as any[], declined: [] as any[] }
    );

    return res.status(200).json({
      data: {
        eventId: event.id,
        requireApproval: event.requireApproval,
        attendees,
        groups,
      },
    });
  } catch (error) {
    console.error("List attendees error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const attendeeDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "DECLINE"]),
});

// Mixed bulk decisions schema
const attendeeBulkDecisionSchema = z.object({
  decisions: z
    .array(
      z.object({
        userId: z.string(),
        decision: z.enum(["APPROVE", "DECLINE"]),
      })
    )
    .min(1),
});

router.post(
  "/:id/attendees/:userId/decision",
  requireAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      const targetUserId = req.params.userId;

      const parsed = attendeeDecisionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid body",
          details: parsed.error.flatten(),
        });
      }

      const event = await prisma.event.findUnique({
        where: { id },
        select: {
          id: true,
          hostId: true,
          coHosts: { select: { id: true } },
        },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const isHost = event.hostId === req.user.id;
      const isCoHost = event.coHosts.some((c) => c.id === req.user.id);
      if (!isHost && !isCoHost) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const attendee = await prisma.eventAttendee.findUnique({
        where: {
          eventId_userId: {
            eventId: id,
            userId: targetUserId,
          },
        },
      });

      if (!attendee || attendee.status !== "PENDING") {
        return res
          .status(400)
          .json({ error: "Attendee not found or not pending" });
      }

      const newStatus =
        parsed.data.decision === "APPROVE" ? "ACCEPTED" : "DECLINED";

      const updated = await prisma.eventAttendee.update({
        where: {
          eventId_userId: {
            eventId: id,
            userId: targetUserId,
          },
        },
        data: { status: newStatus },
        select: {
          eventId: true,
          userId: true,
          status: true,
        },
      });

      return res.status(200).json({ data: updated });
    } catch (error) {
      console.error("Attendee decision error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Bulk mixed approve/decline selected pending attendees
router.post("/:id/attendees/decisions", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const parsed = attendeeBulkDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        hostId: true,
        coHosts: { select: { id: true } },
      },
    });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    const isHost = event.hostId === req.user.id;
    const isCoHost = event.coHosts.some((c) => c.id === req.user.id);
    if (!isHost && !isCoHost) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const decisionMap = new Map(
      parsed.data.decisions.map((d) => [d.userId, d.decision])
    );
    const targetUserIds = Array.from(decisionMap.keys());

    const existing = await prisma.eventAttendee.findMany({
      where: { eventId: id, userId: { in: targetUserIds } },
      select: { userId: true, status: true },
    });

    const pendingSet = new Set(
      existing.filter((e) => e.status === "PENDING").map((e) => e.userId)
    );

    const toApprove: string[] = [];
    const toDecline: string[] = [];
    const skipped: string[] = [];
    for (const [userId, decision] of decisionMap.entries()) {
      if (!pendingSet.has(userId)) {
        skipped.push(userId);
        continue;
      }
      if (decision === "APPROVE") toApprove.push(userId);
      else toDecline.push(userId);
    }

    await prisma.$transaction(async (tx) => {
      if (toApprove.length) {
        await tx.eventAttendee.updateMany({
          where: {
            eventId: id,
            userId: { in: toApprove },
            status: "PENDING",
          },
          data: { status: "ACCEPTED" },
        });
      }
      if (toDecline.length) {
        await tx.eventAttendee.updateMany({
          where: {
            eventId: id,
            userId: { in: toDecline },
            status: "PENDING",
          },
          data: { status: "DECLINED" },
        });
      }
    });

    return res.status(200).json({
      data: {
        eventId: event.id,
        accepted: toApprove,
        declined: toDecline,
        skipped,
      },
    });
  } catch (error) {
    console.error("Bulk mixed attendee decisions error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.use("/:id/activities", activitiesRouter);
router.use("/:id/polls", pollsRouter);
router.use("/:id/cohosts", cohostsRouter);
router.use("/cohosts", cohostsRouter);

export default router;
