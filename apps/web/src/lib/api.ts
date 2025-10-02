import axios, { type AxiosRequestConfig } from "axios";
import type {
  CreateActivityPayload,
  CreateEventPayload,
  EventData,
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
