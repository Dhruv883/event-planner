import { useState, useEffect } from "react";
import type { Activity } from "@/types";
import type { EventData } from "@/lib/types";
import {
  createEmptyActivity,
  mapServerActivityToLocal,
  sortActivitiesByTime,
  createActivityDateTime,
  validateActivityTimes,
} from "../utils/activity-utils";
import { createActivity, deleteActivity } from "@/lib/api/events";

export const useActivities = (event: EventData) => {
  const [activitiesByDay, setActivitiesByDay] = useState<
    Record<string, Activity[]>
  >({});
  const [drafts, setDrafts] = useState<Record<string, Activity>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dayDateMap = (event.days || []).reduce(
    (acc, day) => {
      acc[day.id] = new Date(day.date);
      return acc;
    },
    {} as Record<string, Date>
  );

  useEffect(() => {
    if (!event.days) return;

    const initialActivities: Record<string, Activity[]> = {};
    for (const day of event.days) {
      initialActivities[day.id] = day.activities.map(mapServerActivityToLocal);
    }
    setActivitiesByDay(initialActivities);
  }, [event.days]);

  useEffect(() => {
    if (!event.days) return;

    setActivitiesByDay((prev) => {
      const updated = { ...prev };

      for (const day of event.days!) {
        const serverActivities = day.activities.map(mapServerActivityToLocal);
        const localDrafts = (prev[day.id] || []).filter((a) => !a.id);
        updated[day.id] = [...serverActivities, ...localDrafts];
      }

      return updated;
    });
  }, [event.days]);

  const updateDraft = (dayId: string, draft: Activity) => {
    setDrafts((prev) => ({ ...prev, [dayId]: draft }));
  };

  const addActivity = async (dayId: string) => {
    const draft = drafts[dayId] || createEmptyActivity();
    const title = draft.title.trim();

    if (!title) return;

    const baseDate = dayDateMap[dayId];
    if (!baseDate) {
      setError("Day not found for this event");
      return;
    }

    const validation = validateActivityTimes(draft.startTime, draft.endTime);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    try {
      setSaving(dayId);
      setError(null);

      const startDateTime = draft.startTime
        ? createActivityDateTime(baseDate, draft.startTime)
        : new Date(baseDate);

      const endDateTime =
        draft.endTime && draft.startTime
          ? createActivityDateTime(baseDate, draft.endTime)
          : undefined;

      const created = await createActivity(event.id, {
        dayId,
        title,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime?.toISOString(),
        location: draft.location || undefined,
        description: draft.description || undefined,
      });

      setActivitiesByDay((prev) => {
        const activities = [
          ...(prev[dayId] || []),
          { ...draft, id: created.id },
        ];
        return { ...prev, [dayId]: sortActivitiesByTime(activities) };
      });

      setDrafts((prev) => ({ ...prev, [dayId]: createEmptyActivity() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create activity");
    } finally {
      setSaving(null);
    }
  };

  const removeActivity = async (dayId: string, index: number) => {
    const activity = activitiesByDay[dayId]?.[index];
    if (!activity) return;

    setActivitiesByDay((prev) => ({
      ...prev,
      [dayId]: (prev[dayId] || []).filter((_, i) => i !== index),
    }));

    if (activity.id) {
      try {
        await deleteActivity(event.id, activity.id);
      } catch (e) {
        setActivitiesByDay((prev) => ({
          ...prev,
          [dayId]: [...(prev[dayId] || []), activity],
        }));
        setError(e instanceof Error ? e.message : "Failed to delete activity");
      }
    }
  };

  return {
    activitiesByDay,
    drafts,
    dayDateMap,
    saving,
    error,
    updateDraft,
    addActivity,
    removeActivity,
  };
};
