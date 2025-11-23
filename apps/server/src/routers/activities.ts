import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

const router = express.Router({ mergeParams: true });

const createActivitySchema = z.object({
  dayId: z.string().min(1),
  title: z.string().min(1),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id as string;
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

router.delete("/:activityId", requireAuth, async (req, res) => {
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

export default router;
