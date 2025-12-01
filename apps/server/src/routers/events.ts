import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireEventMember } from "../middleware/event-auth";
import { createDaysForEvent } from "../lib/event-helpers";
import activitiesRouter from "./activities";
import pollsRouter from "./polls";
import cohostsRouter from "./cohosts";
import attendeesRouter from "./attendees";

const router = express.Router();

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  type: z.enum(["ONE_OFF", "WHOLE_DAY", "MULTI_DAY"]),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional().nullable(),
  coverImage: z.url(),
  requireApproval: z.boolean().optional().default(false),
});

// Create a new event
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

    // Validate dates based on event type
    if (type === "ONE_OFF") {
      if (!endAt) {
        return res
          .status(400)
          .json({ error: "End Date is required for ONE_OFF events" });
      }
      if (endAt < startAt) {
        return res
          .status(400)
          .json({ error: "End Date must be after or equal to Start Date" });
      }
    }

    if (type === "MULTI_DAY") {
      if (!endAt) {
        return res
          .status(400)
          .json({ error: "End Date is required for MULTI_DAY events" });
      }
      if (endAt < startAt) {
        return res
          .status(400)
          .json({ error: "End Date must be after or equal to Start Date" });
      }
    }

    const createdEvent = await prisma.$transaction(async (tx) => {
      const eventRow = await tx.event.create({
        data: {
          title,
          description: description,
          location: location,
          type: type,
          startDate: startAt,
          endDate: endAt,
          coverImage,
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

      await createDaysForEvent(tx, eventRow.id, type, startAt, endAt);

      return eventRow;
    });

    return res.status(201).json({ data: createdEvent });
  } catch (err) {
    console.error("Create event error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all events for the user
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
      include: {
        coHosts: {
          select: { id: true },
        },
      },
    });

    // Add user role to each event
    const eventsWithRole = events.map((event) => {
      const isHost = event.hostId === req.user.id;
      const isCoHost = event.coHosts?.some((u) => u.id === req.user.id);
      return {
        ...event,
        userRole: isHost ? "host" : isCoHost ? "cohost" : "attendee",
      };
    });

    return res.status(200).json({ data: eventsWithRole });
  } catch (error) {
    console.error("Get events error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get event by ID
router.get("/:id", requireAuth, requireEventMember, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.event!.id },
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

    return res.status(200).json({
      data: {
        ...event,
        userRole: req.event!.role,
        isHost: req.event!.role === "host",
        isCoHost: req.event!.role === "cohost",
      },
    });
  } catch (error) {
    console.error("Get event by id error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get event preview for invites
router.get("/:id/preview", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
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
        requireApproval: true,
        host: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.status(200).json({
      data: {
        id: event.id,
        title: event.title,
        description: event.description,
        coverImage: event.coverImage,
        type: event.type,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        requireApproval: event.requireApproval,
        host: event.host,
      },
    });
  } catch (error) {
    console.error("Get public event preview error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.use("/:id/activities", activitiesRouter);
router.use("/:id/polls", pollsRouter);
router.use("/:id/cohosts", cohostsRouter);
router.use("/:id/attendees", attendeesRouter);

export default router;
