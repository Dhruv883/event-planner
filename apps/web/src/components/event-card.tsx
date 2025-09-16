import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { MapPin, Users, Clock, ArrowUpRight, Sparkles } from "lucide-react";
import { type Event } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const dt = new Date(event.startDate);
  const time = dt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateLabel = dt.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
  const endDt = event.endDate ? new Date(event.endDate) : null;
  const endDateLabel = endDt
    ? endDt.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
    : null;

  const statusTheme = themeByStatus(event.status);

  return (
    <Link to="/manage/$eventId" params={{ eventId: event.id }}>
      <Card
        className={cn(
          "group relative overflow-hidden p-0 transition-all",
          "rounded-2xl cursor-pointer border border-white/10",
          "bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 backdrop-blur",
          "shadow-[0_10px_35px_-20px_rgba(0,0,0,0.8)] hover:shadow-[0_14px_45px_-18px_rgba(0,0,0,0.9)]"
        )}
      >
        {/* top-right action */}
        <div className="pointer-events-none absolute right-3 top-3 z-10">
          <div
            className={cn(
              "pointer-events-auto grid place-items-center rounded-full p-2 shadow-lg transition-transform duration-200 ring-1 ring-white/15",
              "bg-white/10 text-white hover:scale-105 hover:bg-white/20"
            )}
          >
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        {/* subtle tinted overlay */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-30 transition-opacity duration-500 group-hover:opacity-40",
            statusTheme.tint
          )}
        />

        {/* Content layer */}
        <div className="relative grid grid-cols-[1fr_auto] gap-4 p-5 md:p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
              <Pill
                className={cn("bg-white/10 text-white", "backdrop-blur-sm")}
              >
                <StatusDot
                  colorClass={statusTheme.dot}
                  label={event.status.toLowerCase()}
                />
              </Pill>
            </div>

            <h3 className="mt-2 text-lg md:text-xl font-semibold tracking-tight text-white">
              {event.title}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {event.type === "ONE_OFF" && (
                  <>
                    <span>{time}</span>
                    <span className="mx-1 opacity-50">•</span>
                    <span>{dateLabel}</span>
                  </>
                )}
                {event.type === "WHOLE_DAY" && (
                  <>
                    <span>All day</span>
                    <span className="mx-1 opacity-50">•</span>
                    <span>{dateLabel}</span>
                  </>
                )}
                {event.type === "MULTI_DAY" && (
                  <>
                    <span>
                      {endDateLabel ? `Ends ${endDateLabel}` : "Multi-day"}
                    </span>
                    <span className="mx-1 opacity-50">•</span>
                    <span>Starts {dateLabel}</span>
                  </>
                )}
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>

            {/* bottom row */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AvatarStack namesFromTitle={event.title} />
                <Pill className="bg-white/10 text-white">
                  <Users className="h-3.5 w-3.5 mr-1" /> Host
                </Pill>
              </div>
            </div>
          </div>

          {/* Right column: image */}
          <div className="relative flex h-full w-28 md:w-32 items-center justify-center">
            {event.coverImage ? (
              <img
                src={event.coverImage}
                alt={event.title}
                className="h-24 w-24 md:h-28 md:w-28 rounded-xl object-cover shadow-md ring-1 ring-white/10"
              />
            ) : (
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center text-zinc-300">
                <span className="text-sm">No cover</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function themeByStatus(status: Event["status"]) {
  // Dark-friendly tints that subtly color the card
  switch (status) {
    case "UPCOMING":
      return {
        tint: "from-lime-400/20 via-yellow-400/10 to-amber-400/10",
        glow: "bg-lime-400/20",
        dot: "bg-emerald-400",
      };
    case "LIVE":
      return {
        tint: "from-rose-400/25 via-orange-400/15 to-amber-400/10",
        glow: "bg-rose-400/20",
        dot: "bg-rose-400",
      };
    case "PLANNING":
      return {
        tint: "from-sky-400/20 via-cyan-400/15 to-teal-400/10",
        glow: "bg-sky-400/20",
        dot: "bg-sky-400",
      };
    case "COMPLETED":
      return {
        tint: "from-zinc-500/15 via-zinc-400/10 to-stone-400/10",
        glow: "bg-zinc-400/15",
        dot: "bg-zinc-400",
      };
    case "CANCELLED":
      return {
        tint: "from-rose-500/20 via-red-400/15 to-rose-400/10",
        glow: "bg-rose-400/15",
        dot: "bg-rose-400",
      };
    default:
      return {
        tint: "from-slate-400/15 to-slate-500/10",
        glow: "bg-slate-400/15",
        dot: "bg-slate-400",
      };
  }
}

function Pill({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

function StatusDot({
  colorClass,
  label,
}: {
  colorClass: string;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide">
      <span className={cn("h-2.5 w-2.5 rounded-full", colorClass)} />
      {label && <span className="opacity-70">{label}</span>}
    </span>
  );
}

function AvatarStack({ namesFromTitle }: { namesFromTitle: string }) {
  const words = namesFromTitle.split(" ").filter(Boolean);
  const initials = (i: number) =>
    (words[i]?.[0] || String.fromCharCode(65 + i)).toUpperCase();
  const images: (string | null)[] = [null, null, null];

  return (
    <div className="flex -space-x-2">
      {images.map((img, i) => (
        <Avatar key={i} className="ring-2 ring-black/10">
          {img ? (
            <AvatarImage src={img} alt="attendee" />
          ) : (
            <AvatarFallback className={cn("bg-white/10 text-white")}>
              {initials(i)}
            </AvatarFallback>
          )}
        </Avatar>
      ))}
    </div>
  );
}
