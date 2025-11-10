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

export interface CoHostInvite {
  id: string;
  eventId?: string;
  invitedEmail: string;
  invitedUserId?: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED" | "REMOVED";
  createdAt: string;
  respondedAt?: string | null;
}

export interface CoHostUser {
  id: string;
  name: string | null;
  email: string | null;
}

export interface CoHostOverview {
  coHosts: CoHostUser[];
  invites: CoHostInvite[];
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
