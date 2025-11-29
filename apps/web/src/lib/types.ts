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

// ---- Attendees ----
export type AttendeeStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface EventAttendeeItem {
  eventId: string;
  userId: string;
  status: AttendeeStatus;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface EventAttendeesResponse {
  eventId: string;
  requireApproval: boolean;
  attendees: EventAttendeeItem[];
  groups: {
    pending: EventAttendeeItem[];
    accepted: EventAttendeeItem[];
    declined: EventAttendeeItem[];
  };
}

export interface CreateEventPayload {
  title: string;
  description: string;
  location: string;
  type: "ONE_OFF" | "WHOLE_DAY" | "MULTI_DAY";
  startDate: string | null;
  endDate: string | null;
  coverImage: string;
  requireApproval?: boolean;
}

export interface CreateActivityPayload {
  dayId: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
}

// ---- Polls ----
export type PollStatus = "OPEN" | "CLOSED";
export type PollVoter = "ALL_ATTENDEES" | "ACCEPTED_ATTENDEES" | "HOSTS_ONLY";
export type PollResultVisibility =
  | "VISIBLE_TO_ALL"
  | "VISIBLE_TO_HOSTS_ONLY"
  | "VISIBLE_AFTER_VOTING"
  | "HIDDEN_UNTIL_CLOSED";

export interface PollSettings {
  id: string;
  allowMultipleSelections: boolean;
  voterPermission: PollVoter;
  resultVisibility: PollResultVisibility;
  pollId: string;
}

export interface PollOptionDTO {
  id: string;
  text: string;
  order: number;
  count?: number; // present depending on visibility
}

export interface PollDTO {
  id: string;
  title: string;
  description?: string | null;
  status: PollStatus;
  settings?: Partial<PollSettings> | null;
  options: PollOptionDTO[];
  mySelections: string[]; // option ids
}

export interface CreatePollPayload {
  title: string;
  description?: string | null;
  options: string[]; // option texts
  settings?: Partial<
    Pick<
      PollSettings,
      "allowMultipleSelections" | "voterPermission" | "resultVisibility"
    >
  >;
}

export interface VotePayload {
  optionIds: string[];
}
