import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, MapPin, Plus } from "lucide-react";
import type { EventData } from "@/lib/types";

export type ActivityDraft = {
  title: string;
  time?: string;
  location?: string;
  description?: string;
};

export function ScheduleSection({ event }: { event: EventData }) {
  const isMulti = event.type === "MULTI_DAY";
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : null;

  const startOfDayUTC = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const enumerateDaysInclusiveUTC = (from: Date, to: Date) => {
    const days: Date[] = [];
    let cursor = startOfDayUTC(from);
    const last = startOfDayUTC(to);
    while (cursor.getTime() <= last.getTime()) {
      days.push(new Date(cursor));
      cursor = new Date(cursor);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
  };

  const days: Date[] = (() => {
    if (event.type === "WHOLE_DAY") return [start];
    if (isMulti && end) return enumerateDaysInclusiveUTC(start, end);
    return [start];
  })();

  const keyFor = (d: Date) => d.toISOString().slice(0, 10);
  const [activitiesByDay, setActivitiesByDay] = useState<
    Record<string, ActivityDraft[]>
  >({});
  const [drafts, setDrafts] = useState<Record<string, ActivityDraft>>({});

  const addActivity = (dayKey: string) => {
    const d = drafts[dayKey] || { title: "" };
    const title = (d.title || "").trim();
    if (!title) return;
    setActivitiesByDay((prev) => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), { ...d }],
    }));
    setDrafts((prev) => ({
      ...prev,
      [dayKey]: { title: "", time: "", location: "", description: "" },
    }));
  };

  const removeActivity = (dayKey: string, idx: number) => {
    setActivitiesByDay((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="space-y-4">
      {days.map((d) => {
        const key = keyFor(d);
        const label = d.toLocaleDateString(undefined, {
          weekday: "short",
          day: "2-digit",
          month: "short",
        });
        const items = activitiesByDay[key] || [];
        return (
          <Card key={key} className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{label}</h3>
              <span className="text-xs text-zinc-500">
                {items.length} activities
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {items.map((act, i) => (
                <li key={i} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{act.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        {act.time && (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> {act.time}
                          </span>
                        )}
                        {act.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" /> {act.location}
                          </span>
                        )}
                      </div>
                      {act.description && (
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400 line-clamp-3">
                          {act.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeActivity(key, i)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
              {items.length === 0 && (
                <li className="text-sm text-zinc-500">No activities yet</li>
              )}
            </ul>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <Label htmlFor={`title-${key}`}>Title</Label>
                <Input
                  id={`title-${key}`}
                  placeholder="e.g., Lunch at 1pm"
                  value={drafts[key]?.title ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [key]: { ...(prev[key] || {}), title: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor={`time-${key}`}>Time</Label>
                <Input
                  id={`time-${key}`}
                  type="time"
                  placeholder="14:00"
                  value={drafts[key]?.time ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [key]: { ...(prev[key] || {}), time: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor={`loc-${key}`}>Location</Label>
                <Input
                  id={`loc-${key}`}
                  placeholder="Venue or address"
                  value={drafts[key]?.location ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [key]: { ...(prev[key] || {}), location: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="md:col-span-4">
                <Label htmlFor={`desc-${key}`}>Description</Label>
                <Textarea
                  id={`desc-${key}`}
                  placeholder="Details or notes"
                  value={drafts[key]?.description ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [key]: {
                        ...(prev[key] || {}),
                        description: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <Button onClick={() => addActivity(key)}>
                  <Plus className="h-4 w-4 mr-1" /> Add activity
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
