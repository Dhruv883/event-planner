import { Card } from "@/components/ui/card";
import type { EventData } from "@/lib/types";
import { DayCard } from "./day-card";
import { useActivities } from "@/hooks/useActivities";
import { createEmptyActivity } from "../../utils/activity-utils";

export function ScheduleSection({ event }: { event: EventData }) {
  const {
    activitiesByDay,
    drafts,
    dayDateMap,
    saving,
    error,
    updateDraft,
    addActivity,
    removeActivity,
  } = useActivities(event);

  const sortedDays = (event.days || [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getDraft = (dayId: string) => drafts[dayId] || createEmptyActivity();

  if (sortedDays.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-zinc-500">No days found for this event.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      {sortedDays.map((day) => (
        <DayCard
          key={day.id}
          dayId={day.id}
          dayDate={dayDateMap[day.id]}
          activities={activitiesByDay[day.id] || []}
          draft={getDraft(day.id)}
          onDraftChange={(draft) => updateDraft(day.id, draft)}
          onAddActivity={() => addActivity(day.id)}
          onRemoveActivity={(index) => removeActivity(day.id, index)}
          isLoading={saving === day.id}
        />
      ))}
    </div>
  );
}
