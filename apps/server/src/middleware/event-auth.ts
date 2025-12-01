import type { Request, Response, NextFunction } from "express";
import prisma from "../../prisma";

export type UserRole = "host" | "cohost" | "attendee";

/**
 * Fetches event context and determines the user's role.
 * Returns null if the user has no association with the event.
 */
async function getEventContext(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      hostId: true,
      coHosts: {
        where: { id: userId },
        select: { id: true },
      },
      attendees: {
        where: { userId: userId },
        select: { userId: true },
      },
    },
  });

  if (!event) {
    return null;
  }

  const isHost = event.hostId === userId;
  const isCoHost = event.coHosts.length > 0;
  const isAttendee = event.attendees.length > 0;

  // Determine the user's primary role
  let role: UserRole | null = null;
  if (isHost) {
    role = "host";
  } else if (isCoHost) {
    role = "cohost";
  } else if (isAttendee) {
    role = "attendee";
  }

  return {
    event: {
      id: event.id,
      hostId: event.hostId,
    },
    role,
  };
}

/**
 * Checks if the authenticated user has one of the allowed roles for the event.
 */
export const requireEventRole = (allowedRoles?: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const eventId = req.params.id || req.params.eventId;

      if (!eventId) {
        return res.status(400).json({ error: "Event ID is required" });
      }

      const eventContext = await getEventContext(eventId, req.user.id);

      if (!eventContext) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (!eventContext.role) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(eventContext.role)) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      req.event = {
        id: eventContext.event.id,
        hostId: eventContext.event.hostId,
        role: eventContext.role,
      };

      next();
    } catch (err) {
      console.error("Event authorization error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware that requires the user to be the event host.
 * Shorthand for requireEventRole(["host"]).
 */
export const requireHost = requireEventRole(["host"]);

/**
 * Middleware that requires the user to be host or cohost.
 * Shorthand for requireEventRole(["host", "cohost"]).
 */
export const requireHostOrCoHost = requireEventRole(["host", "cohost"]);

/**
 * Middleware that requires the user to be any event member.
 * Shorthand for requireEventRole() with no restrictions.
 */
export const requireEventMember = requireEventRole();

/**
 * Extended request interface with event context.
 * Populated by event authorization middleware.
 */
declare global {
  namespace Express {
    interface Request {
      event?: {
        id: string;
        hostId: string;
        role: UserRole;
      };
    }
  }
}
