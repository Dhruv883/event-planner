const baseURL = import.meta.env.VITE_SERVER_URL;

interface Event {
  id: string;
  title: string;
  description: string | null;
  coverImage: string;
  type: "ONE_OFF" | "WHOLE_DAY" | "MULTI_DAY";
  status: "PLANNING" | "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";
  startDate: string;
  endDate: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  hostId: string;
}

interface ApiResponse<T> {
  data: T;
}

interface ApiError {
  error: string;
  details?: any;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseURL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchEvents(): Promise<Event[]> {
  const response = await apiRequest<ApiResponse<Event[]>>("/api/events");
  return response.data;
}

export async function fetchEvent(eventId: string): Promise<Event> {
  const response = await apiRequest<ApiResponse<Event>>(
    `/api/events/${encodeURIComponent(eventId)}`
  );
  return response.data;
}

export type { Event };
