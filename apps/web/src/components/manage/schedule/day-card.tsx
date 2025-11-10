import { Card } from "@/components/ui/card";
import { ActivityItem } from "./activity-item";
import { ActivityForm } from "./activity-form";
import type { Activity } from "@/types";

interface DayCardProps {
  dayId: string;
  dayDate: Date;
  activities: Activity[];
  draft: Activity;
  onDraftChange: (draft: Activity) => void;
  onAddActivity: () => Promise<void>;
  onRemoveActivity: (index: number) => void;
  isLoading: boolean;
}

export function DayCard({
  dayId,
  dayDate,
  activities,
  draft,
  onDraftChange,
  onAddActivity,
  onRemoveActivity,
  isLoading,
}: DayCardProps) {
  const formatDayLabel = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{formatDayLabel(dayDate)}</h3>
        <span className="text-xs text-zinc-500">
          {activities.length} activities
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {activities.length === 0 ? (
          <li className="text-sm text-zinc-500">No activities yet</li>
        ) : (
          activities.map((activity, index) => (
            <ActivityItem
              key={index}
              activity={activity}
              onRemove={() => onRemoveActivity(index)}
              isRemoving={isLoading}
            />
          ))
        )}
      </ul>

      <ActivityForm
        dayId={dayId}
        draft={draft}
        onDraftChange={onDraftChange}
        onAdd={onAddActivity}
        isLoading={isLoading}
      />
    </Card>
  );
}
