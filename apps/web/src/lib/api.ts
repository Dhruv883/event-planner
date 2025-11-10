import axios, { type AxiosRequestConfig } from "axios";
import type {
  CreateActivityPayload,
  CreateEventPayload,
  EventData,
  CoHostOverview,
  CoHostInvite,
} from "./types";

const config = {
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
};

interface ApiResponse<T> {
  data: T;
}

async function apiRequest<T>(
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<T> {
  const url = `${config.baseURL}${endpoint}`;

  try {
    const response = await axios({
      url,
      method: options.method || "GET",
      data: options.data,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      withCredentials: true,
      ...options,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function fetchEvents(): Promise<EventData[]> {
  const response = await apiRequest<ApiResponse<EventData[]>>("/api/events");
  return response.data;
}

export async function fetchEvent(eventId: string): Promise<EventData> {
  const response = await apiRequest<ApiResponse<EventData>>(
    `/api/events/${encodeURIComponent(eventId)}`
  );
  return response.data;
}

export async function createEvent(
  payload: CreateEventPayload
): Promise<string> {
  const response = await apiRequest<ApiResponse<{ id: string }>>(
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
  const response = await apiRequest<ApiResponse<any>>(
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

// ---- Co-host API ----
export async function createCoHostInvite(eventId: string, email: string) {
  const res = await apiRequest<{ data: CoHostInvite }>(
    `/api/events/${encodeURIComponent(eventId)}/cohosts/invite`,
    { method: "POST", data: { email } }
  );
  return res.data;
}

export async function fetchCoHostOverview(eventId: string) {
  const res = await apiRequest<{ data: CoHostOverview }>(
    `/api/events/${eventId}/cohosts/invites`
  );
  return res.data;
}

export async function acceptCoHostInvite(eventId: string, inviteId: string) {
  const res = await apiRequest<{ data: { id: string; status: string } }>(
    `/api/events/${encodeURIComponent(eventId)}/cohosts/invites/${encodeURIComponent(
      inviteId
    )}/accept`,
    { method: "POST" }
  );
  return res.data;
}

export async function declineCoHostInvite(eventId: string, inviteId: string) {
  const res = await apiRequest<{ data: { id: string; status: string } }>(
    `/api/events/${encodeURIComponent(eventId)}/cohosts/invites/${encodeURIComponent(
      inviteId
    )}/decline`,
    { method: "POST" }
  );
  return res.data;
}

export async function revokeCoHostInvite(eventId: string, inviteId: string) {
  await apiRequest<null>(
    `/api/events/${encodeURIComponent(eventId)}/cohosts/invites/${encodeURIComponent(
      inviteId
    )}/revoke`,
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
