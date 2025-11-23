import { apiRequest } from "../api-client";
import type { CoHostOverview, CoHostInvite } from "../types";

export async function createCoHostInvite(eventId: string, email: string) {
  const res = await apiRequest<{ data: CoHostInvite }>(
    `/api/events/${encodeURIComponent(eventId)}/cohosts/invite`,
    { method: "POST", data: { email } }
  );
  return res.data;
}

export async function fetchCoHostOverview(eventId: string) {
  const res = await apiRequest<{ data: CoHostOverview }>(
    `/api/events/${encodeURIComponent(eventId)}/cohosts/invites`
  );
  return res.data;
}

export async function acceptCoHostInvite(eventId: string, inviteId: string) {
  const res = await apiRequest<{ data: { id: string; status: string } }>(
    `/api/events/${encodeURIComponent(
      eventId
    )}/cohosts/invites/${encodeURIComponent(inviteId)}/accept`,
    { method: "POST" }
  );
  return res.data;
}

export async function declineCoHostInvite(eventId: string, inviteId: string) {
  const res = await apiRequest<{ data: { id: string; status: string } }>(
    `/api/events/${encodeURIComponent(
      eventId
    )}/cohosts/invites/${encodeURIComponent(inviteId)}/decline`,
    { method: "POST" }
  );
  return res.data;
}

export async function revokeCoHostInvite(eventId: string, inviteId: string) {
  await apiRequest<null>(
    `/api/events/${encodeURIComponent(
      eventId
    )}/cohosts/invites/${encodeURIComponent(inviteId)}/revoke`,
    { method: "POST" }
  );
}

export async function removeCoHost(eventId: string, userId: string) {
  await apiRequest<null>(
    `/api/events/${encodeURIComponent(eventId)}/cohosts/${encodeURIComponent(
      userId
    )}`,
    { method: "DELETE" }
  );
}

export async function fetchCoHostInvites() {
  const res = await apiRequest<{
    data: Array<{
      id: string;
      invitedEmail: string;
      invitedUserId?: string | null;
      status: string;
      createdAt: string;
      respondedAt?: string | null;
      event: {
        id: string;
        title: string;
        coverImage: string | null;
        startDate: string;
      };
      inviter: { id: string; name: string | null; email: string | null };
    }>;
  }>("/api/events/cohosts/invite/me");
  return res.data;
}
