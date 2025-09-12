import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

const router = express.Router();

// Validation schema for creating an event
const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  type: z.enum(["ONE_OFF", "WHOLE_DAY", "MULTI_DAY"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  coverImage: z.string().url(),
});

router.post("/", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers as Record<string, string>),
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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
          hostId: session.user.id,
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

      // Create Day rows only for WHOLE_DAY and MULTI_DAY
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

export default router;
