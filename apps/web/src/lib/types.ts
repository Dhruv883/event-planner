export interface EventData {
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

export interface CreateEventPayload {
  title: string;
  description: string;
  location: string;
  type: "ONE_OFF" | "WHOLE_DAY" | "MULTI_DAY";
  startDate: string | null;
  endDate: string | null;
  coverImage: string;
}
