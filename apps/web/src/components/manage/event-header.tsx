import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Edit3,
  ExternalLink,
  Link as LinkIcon,
  MapPin,
} from "lucide-react";
import type { EventData } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<EventData["status"], string> = {
  PLANNING: "border-sky-500/30 text-sky-400",
  UPCOMING: "border-emerald-500/30 text-emerald-400",
  LIVE: "border-rose-500/30 text-rose-400",
  COMPLETED: "border-zinc-500/30 text-zinc-400",
  CANCELLED: "border-red-500/30 text-red-400",
};

export interface EventHeaderProps {
  event: EventData;
  dateLabel: string | null;
  endDateLabel: string | null;
  time: string | null;
  onCopyLink: () => Promise<void>;
  copyState: { copied: boolean; error: boolean };
}

export function EventHeader({
  event,
  dateLabel,
  endDateLabel,
  time,
  onCopyLink,
  copyState,
}: EventHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="outline"
            className={cn("capitalize", STATUS_CLASS[event.status])}
          >
            {event.status.toLowerCase()}
          </Badge>
          <span className="text-xs text-zinc-500">
            {event.type.toUpperCase()}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight truncate">
          {event.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
          {dateLabel && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {dateLabel}
            </span>
          )}
          {event.type === "ONE_OFF" && time && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {time}
            </span>
          )}
          {event.type === "MULTI_DAY" && endDateLabel && (
            <span>Ends {endDateLabel}</span>
          )}
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {event.location}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Link to="/edit/$eventId" params={{ eventId: event.id }}>
          <Button variant="secondary">
            <Edit3 className="h-4 w-4 mr-2" /> Edit
          </Button>
        </Link>
        <Link to="/$eventId" params={{ eventId: event.id }}>
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" /> View
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={onCopyLink}
          aria-live="polite"
          aria-label={copyState.copied ? "Link copied" : "Copy public link"}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          {copyState.copied
            ? copyState.error
              ? "Error"
              : "Copied!"
            : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

export { STATUS_CLASS };
