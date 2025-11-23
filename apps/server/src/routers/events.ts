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

router.use("/:id/activities", activitiesRouter);
router.use("/:id/polls", pollsRouter);
router.use("/:id/cohosts", cohostsRouter);
router.use("/cohosts", cohostsRouter);

export default router;
