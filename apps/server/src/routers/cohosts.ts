import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireHost, requireHostOrCoHost } from "@/middleware/event-auth";

const router = express.Router({ mergeParams: true });

const inviteByEmailSchema = z.object({ email: z.string().email() });

// Invite a co-host by email
router.post("/invite", requireAuth, requireHostOrCoHost, async (req, res) => {
  try {
    const eventId = req.event!.id;

    const parsedBody = inviteByEmailSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid body", details: parsedBody.error.flatten() });
    }

    const email = parsedBody.data.email.toLowerCase();

    const event: any = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        hostId: true,
        coHosts: { select: { id: true, email: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

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

// Get co-host invites and current co-hosts
router.get("/invites", requireAuth, requireHostOrCoHost, async (req, res) => {
  try {
    const eventId = req.event!.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        hostId: true,
        coHosts: { select: { id: true, name: true, email: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const invites = await prisma.coHostInvite.findMany({
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

// Accept a co-host invite
router.post("/invites/:inviteId/accept", requireAuth, async (req, res) => {
  try {
    const { id: eventId, inviteId } = req.params;
    const userId = req.user.id;

    const invite = await (prisma as any).coHostInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.eventId !== eventId) {
      return res.status(404).json({ error: "Invite not found" });
    }

    if (invite.status !== "PENDING") {
      return res.status(400).json({ error: "Invite not pending" });
    }

    if (invite.invitedUserId && invite.invitedUserId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedInvite = await prisma.coHostInvite.update({
      where: { id: inviteId },
      data: {
        status: "ACCEPTED",
        respondedAt: new Date(),
        invitedUserId: invite.invitedUserId || userId,
      },
      select: { id: true, status: true },
    });

    return res.status(200).json({ data: updatedInvite });
  } catch (err) {
    console.error("Accept cohost invite error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Decline a co-host invite
router.post("/invites/:inviteId/decline", requireAuth, async (req, res) => {
  try {
    const { id: eventId, inviteId } = req.params;

    const invite = await prisma.coHostInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.eventId !== eventId) {
      return res.status(404).json({ error: "Invite not found" });
    }
    if (invite.status !== "PENDING") {
      return res.status(400).json({ error: "Invite not pending" });
    }
    if (invite.invitedUserId && invite.invitedUserId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedInvite = await prisma.coHostInvite.update({
      where: { id: inviteId },
      data: {
        status: "DECLINED",
        respondedAt: new Date(),
        invitedUserId: invite.invitedUserId || req.user.id,
      },
      select: { id: true, status: true },
    });

    return res.status(200).json({ data: updatedInvite });
  } catch (err) {
    console.error("Decline cohost invite error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Revoke a co-host invite
router.post("/invites/:inviteId/revoke", requireAuth, requireHost, async (req, res) => {
  try {
    const { id: eventId, inviteId } = req.params;

    const invite = await prisma.coHostInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.eventId !== eventId) {
      return res.status(404).json({ error: "Invite not found" });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (invite.status !== "PENDING") {
      return res.status(400).json({ error: "Cannot revoke non-pending invite" });
    }

    await prisma.coHostInvite.update({
      where: { id: inviteId },
      data: { status: "REVOKED", respondedAt: new Date() },
    });

    return res.status(204).send();
  } catch (err) {
    console.error("Revoke cohost invite error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Remove a co-host
router.delete("/:userId", requireAuth, requireHost, async (req, res) => {
  try {
    const { id: eventId, userId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, coHosts: { select: { id: true, email: true } } },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (userId === event.hostId) {
      return res.status(400).json({ error: "Cannot remove host" });
    }
    if (!event.coHosts.some((c) => c.id === userId)) {
      return res.status(404).json({ error: "User not a co-host" });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { coHosts: { disconnect: { id: userId } } },
    });

    // Mark the most recent accepted invite as removed
    const latestAcceptedInvite = await prisma.coHostInvite.findFirst({
      where: { eventId, invitedUserId: userId, status: "ACCEPTED" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (latestAcceptedInvite) {
      await prisma.coHostInvite.update({
        where: { id: latestAcceptedInvite.id },
        data: { status: "REMOVED", respondedAt: new Date() },
      });
    }

    return res.status(204).send();
  } catch (err) {
    console.error("Remove cohost error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
