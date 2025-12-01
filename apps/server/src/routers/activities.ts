import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireHostOrCoHost } from "../middleware/event-auth";

const router = express.Router({ mergeParams: true });

const createActivitySchema = z.object({
  dayId: z.string().min(1),
  title: z.string().min(1),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

interface ValidatedActivityData {
  dayId: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  description?: string;
}

async function validateActivityData(body: any, eventId: string): Promise<ValidatedActivityData> {
  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Invalid body");
  }

  const { dayId, title, startTime: startISO, endTime: endISO, location, description } = parsed.data;

  // Validate day belongs to event
  const day = await prisma.day.findFirst({
    where: { id: dayId, eventId },
    select: { id: true, date: true },
  });
  if (!day) {
    throw new Error("Invalid dayId for this event");
  }

  // Validate startTime
  const startTime = new Date(startISO);
  if (isNaN(startTime.getTime())) {
    throw new Error("Invalid startTime");
  }

  // Check if startTime matches day's date
  const dayUTC = day.date;
  const sameDay =
    startTime.getUTCFullYear() === dayUTC.getUTCFullYear() &&
    startTime.getUTCMonth() === dayUTC.getUTCMonth() &&
    startTime.getUTCDate() === dayUTC.getUTCDate();
  if (!sameDay) {
    throw new Error("startTime does not match dayId date");
  }

  // Validate endTime if provided
  let endTime: Date | undefined = undefined;
  if (endISO) {
    endTime = new Date(endISO);
    if (isNaN(endTime.getTime())) {
      throw new Error("Invalid endTime");
    }
    if (endTime < startTime) {
      throw new Error("endTime must be after startTime");
    }
  }

  return {
    dayId: day.id,
    title,
    startTime,
    endTime,
    location: location ?? undefined,
    description: description ?? undefined,
  };
}

router.post("/", requireAuth, requireHostOrCoHost, async (req, res) => {
  try {
    const eventId = req.event!.id;

    const validatedData = await validateActivityData(req.body, eventId);

    const activity = await prisma.activity.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        location: validatedData.location,
        dayId: validatedData.dayId,
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
    if (err instanceof Error) {
      if (err.message === "Invalid body") {
        const parsed = createActivitySchema.safeParse(req.body);
        return res.status(400).json({ error: err.message, details: parsed.error?.flatten() });
      }
      return res.status(400).json({ error: err.message });
    }
    console.error("Create activity error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:activityId", requireAuth, requireHostOrCoHost, async (req, res) => {
  try {
    const { activityId } = req.params;
    const eventId = req.event!.id;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, day: { select: { eventId: true } } },
    });

    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    if (activity.day.eventId !== eventId) {
      return res.status(400).json({ error: "Activity does not belong to event" });
    }

    await prisma.activity.delete({ where: { id: activityId } });

    return res.status(204).send();
  } catch (err) {
    console.error("Delete activity error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
