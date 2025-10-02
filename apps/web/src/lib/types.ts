export interface EventDay {
  id: string;
  date: string;
  activities: Activity[];
}

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
}

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
  days?: EventDay[];
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

export interface CreateActivityPayload {
  dayId: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
}
