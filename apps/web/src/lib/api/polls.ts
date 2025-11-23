import { apiRequest } from "../api-client";
import type { CreatePollPayload, PollDTO, VotePayload } from "../types";

export async function createPoll(eventId: string, payload: CreatePollPayload) {
  const res = await apiRequest<{ data: { id: string } }>(
    `/api/events/${encodeURIComponent(eventId)}/polls`,
    { method: "POST", data: payload }
  );
  return res.data;
}

export async function fetchPolls(eventId: string) {
  const res = await apiRequest<{ data: PollDTO[] }>(
    `/api/events/${encodeURIComponent(eventId)}/polls`
  );
  return res.data;
}

export async function votePoll(
  eventId: string,
  pollId: string,
  payload: VotePayload
) {
  await apiRequest<null>(
    `/api/events/${encodeURIComponent(eventId)}/polls/${encodeURIComponent(
      pollId
    )}/vote`,
    { method: "POST", data: payload }
  );
}

export async function updatePoll(
  eventId: string,
  pollId: string,
  payload: Partial<{
    title: string;
    description: string | null;
    status: "OPEN" | "CLOSED";
    settings: Partial<{
      allowMultipleSelections: boolean;
      voterPermission:
        | "ALL_ATTENDEES"
        | "ACCEPTED_ATTENDEES"
        | "HOSTS_ONLY";
      resultVisibility:
        | "VISIBLE_TO_ALL"
        | "VISIBLE_TO_HOSTS_ONLY"
        | "VISIBLE_AFTER_VOTING"
        | "HIDDEN_UNTIL_CLOSED";
    }>;
  }>
) {
  const res = await apiRequest<{ data: { id: string } }>(
    `/api/events/${encodeURIComponent(eventId)}/polls/${encodeURIComponent(
      pollId
    )}`,
    { method: "PATCH", data: payload }
  );
  return res.data;
}
