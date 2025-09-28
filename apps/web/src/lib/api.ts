import axios, { type AxiosRequestConfig } from "axios";
import type { CreateEventPayload, EventData } from "./types";

/**
 * API configuration
 */
const config = {
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
};

/**
 * Standard API response wrapper
 */
interface ApiResponse<T> {
  data: T;
}

/**
 * Custom API error class for better error handling
 */
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
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
