import type { Activity } from "@/types";

export const createEmptyActivity = (): Activity => ({
  title: "",
  startTime: "",
  endTime: "",
  location: "",
  description: "",
});

export const mapServerActivityToLocal = (serverActivity: any): Activity => ({
  id: serverActivity.id,
  title: serverActivity.title,
  description: serverActivity.description || "",
  location: serverActivity.location || "",
  startTime: serverActivity.startTime
    ? new Date(serverActivity.startTime).toISOString().slice(11, 16)
    : "",
  endTime: serverActivity.endTime
    ? new Date(serverActivity.endTime).toISOString().slice(11, 16)
    : "",
});

export const sortActivitiesByTime = (activities: Activity[]): Activity[] => {
  return activities.sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });
};

export const createActivityDateTime = (
  baseDate: Date,
  timeString: string
): Date => {
  const [hours, minutes] = timeString.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error("Invalid time format");
  }

  return new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      hours,
      minutes
    )
  );
};

export const validateActivityTimes = (
  startTime?: string,
  endTime?: string
): { isValid: boolean; error?: string } => {
  if (endTime && !startTime) {
    return { isValid: false, error: "Start time required if end time is set" };
  }

  if (startTime && endTime) {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

    if (end <= start) {
      return { isValid: false, error: "End time must be after start time" };
    }
  }

  return { isValid: true };
};
