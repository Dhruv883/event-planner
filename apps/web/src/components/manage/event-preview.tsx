import { Card } from "@/components/ui/card";
import type { EventData } from "@/lib/types";

interface EventPreviewProps {
  event: EventData;
}

export function EventPreview({ event }: EventPreviewProps) {
  return (
    <Card className="overflow-hidden">
      {event.coverImage ? (
        <img
          src={event.coverImage}
          alt={event.title}
          className="w-full h-44 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-44 grid place-items-center text-sm text-zinc-500">
          No cover image
        </div>
      )}
      <div className="p-4 text-sm text-zinc-600">
        <div>
          <span className="font-medium">Created: </span>
          <span>{new Date(event.createdAt).toLocaleString()}</span>
        </div>
        <div className="mt-1">
          <span className="font-medium">Updated: </span>
          <span>{new Date(event.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    </Card>
  );
}
