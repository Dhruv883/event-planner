import { Button } from "@/components/ui/button";
import { Clock, MapPin } from "lucide-react";
import type { ActivityItemProps } from "@/types";

export function ActivityItem({
  activity,
  onRemove,
  isRemoving,
}: ActivityItemProps) {
  const formatTimeRange = () => {
    if (!activity.startTime) return null;
    return activity.endTime
      ? `${activity.startTime} – ${activity.endTime}`
      : activity.startTime;
  };

  return (
    <li className="rounded-md border px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{activity.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            {activity.startTime && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatTimeRange()}
              </span>
            )}
            {activity.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {activity.location}
              </span>
            )}
          </div>
          {activity.description && (
            <p className="mt-1 text-zinc-600 dark:text-zinc-400 line-clamp-3">
              {activity.description}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          disabled={isRemoving}
        >
          Remove
        </Button>
      </div>
    </li>
  );
}
