import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

const router = express.Router({ mergeParams: true });

// Join an event as attendee (with optional approval)
router.post("/join", requireAuth, async (req, res) => {
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
      return res.status(400).json({ error: "Host is already part of the event" });
    }

    const existing = event.attendees[0];
    if (existing?.status === "ACCEPTED") {
      return res.status(200).json({ data: { status: "ACCEPTED" as const }, reused: true });
    }
    if (existing?.status === "PENDING") {
      return res.status(200).json({ data: { status: "PENDING" as const }, reused: true });
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
router.get("/pending", requireAuth, async (req, res) => {
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
router.get("/", requireAuth, async (req, res) => {
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

router.post("/:userId/decision", requireAuth, async (req, res) => {
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
      return res.status(400).json({ error: "Attendee not found or not pending" });
    }

    const newStatus = parsed.data.decision === "APPROVE" ? "ACCEPTED" : "DECLINED";

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
});

// Bulk mixed approve/decline selected pending attendees
router.post("/decisions", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const parsed = attendeeBulkDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
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

    const decisionMap = new Map(parsed.data.decisions.map((d) => [d.userId, d.decision]));
    const targetUserIds = Array.from(decisionMap.keys());

    const existing = await prisma.eventAttendee.findMany({
      where: { eventId: id, userId: { in: targetUserIds } },
      select: { userId: true, status: true },
    });

    const pendingSet = new Set(existing.filter((e) => e.status === "PENDING").map((e) => e.userId));

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

export default router;
