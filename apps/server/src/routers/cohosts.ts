import express from "express";
import prisma from "../../prisma";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

const router = express.Router({ mergeParams: true });

const inviteByEmailSchema = z.object({ email: z.string().email() });

router.post("/invite", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id as string;
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

router.get("/invites", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id as string;
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

router.post("/invites/:inviteId/accept", requireAuth, async (req, res) => {
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
      if (!me || me.email.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
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
});

router.post("/invites/:inviteId/decline", requireAuth, async (req, res) => {
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
      if (!me || me.email.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
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
});

router.post("/invites/:inviteId/revoke", requireAuth, async (req, res) => {
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
});

router.delete("/:userId", requireAuth, async (req, res) => {
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

router.get("/invite/me", requireAuth, async (req, res) => {
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
