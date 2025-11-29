import { apiRequest } from "../api-client";
import type { EventAttendeesResponse } from "../types";

export async function fetchEventAttendees(eventId: string) {
  const res = await apiRequest<{ data: EventAttendeesResponse }>(
    `/api/events/${encodeURIComponent(eventId)}/attendees`
  );
  return res.data;
}

export async function approveAttendee(eventId: string, userId: string) {
  const res = await apiRequest<{
    data: { eventId: string; userId: string; status: string };
  }>(
    `/api/events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(userId)}/decision`,
    { method: "POST", data: { decision: "APPROVE" } }
  );
  return res.data;
}

export async function declineAttendee(eventId: string, userId: string) {
  const res = await apiRequest<{
    data: { eventId: string; userId: string; status: string };
  }>(
    `/api/events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(userId)}/decision`,
    { method: "POST", data: { decision: "DECLINE" } }
  );
  return res.data;
}

// approveAllPendingAttendees removed; use bulkDecideAttendees with all APPROVE decisions instead.

export interface BulkAttendeeDecision {
  userId: string;
  decision: "APPROVE" | "DECLINE";
}

export async function bulkDecideAttendees(
  eventId: string,
  decisions: BulkAttendeeDecision[]
) {
  const res = await apiRequest<{
    data: {
      eventId: string;
      accepted: string[];
      declined: string[];
      skipped: string[];
    };
  }>(`/api/events/${encodeURIComponent(eventId)}/attendees/decisions`, {
    method: "POST",
    data: { decisions },
  });
  return res.data;
}
