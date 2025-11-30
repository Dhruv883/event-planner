import express from "express";
import prisma from "../../prisma";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// Get all cohost invites for the current user
router.get("/cohosts/me", requireAuth, async (req, res) => {
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
