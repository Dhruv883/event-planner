import { apiRequest } from "../api-client";
import type {
  CreateActivityPayload,
  CreateEventPayload,
  EventData,
  EventPublicPreview,
} from "../types";

export async function fetchEvents(): Promise<EventData[]> {
  const response = await apiRequest<{ data: EventData[] }>("/api/events");
  return response.data;
}

export async function fetchEvent(eventId: string): Promise<EventData> {
  const response = await apiRequest<{ data: EventData }>(
    `/api/events/${encodeURIComponent(eventId)}`
  );
  return response.data;
}

export async function fetchEventPublicPreview(
  eventId: string
): Promise<EventPublicPreview> {
  const response = await apiRequest<{ data: EventPublicPreview }>(
    `/api/events/${encodeURIComponent(eventId)}/preview`
  );
  return response.data;
}

export async function joinEvent(
  eventId: string
): Promise<{ status: "PENDING" | "ACCEPTED"; reused?: boolean }> {
  const response = await apiRequest<{
    data: { status: "PENDING" | "ACCEPTED" };
    reused?: boolean;
  }>(`/api/events/${encodeURIComponent(eventId)}/join`, {
    method: "POST",
  });
  return { status: response.data.status, reused: response.reused };
}

export async function createEvent(
  payload: CreateEventPayload
): Promise<string> {
  const response = await apiRequest<{ data: { id: string } }>("/api/events", {
    method: "POST",
    data: payload,
  });
  return response.data.id;
}

export async function createActivity(
  eventId: string,
  payload: CreateActivityPayload
) {
  const response = await apiRequest<{ data: any }>(
    `/api/events/${encodeURIComponent(eventId)}/activities`,
    { method: "POST", data: payload }
  );
  return response.data;
}

export async function deleteActivity(eventId: string, activityId: string) {
  await apiRequest<null>(
    `/api/events/${encodeURIComponent(eventId)}/activities/${encodeURIComponent(
      activityId
    )}`,
    { method: "DELETE" }
  );
}
