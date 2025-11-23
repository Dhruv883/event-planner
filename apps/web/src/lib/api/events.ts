import { apiRequest } from "../api-client";
import type {
  CreateActivityPayload,
  CreateEventPayload,
  EventData,
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

export async function createEvent(
  payload: CreateEventPayload
): Promise<string> {
  const response = await apiRequest<{ data: { id: string } }>(
    "/api/events",
    {
      method: "POST",
      data: payload,
    }
  );
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
