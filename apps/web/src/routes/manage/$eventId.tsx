import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { fetchEvent } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  Edit3,
  ExternalLink,
  Link as LinkIcon,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OverviewSection } from "../../components/manage/overview-tab";
import { ScheduleSection } from "../../components/manage/schedule-section";
import { PollsSection } from "../../components/manage/polls";
import { InvitesSection } from "../../components/manage/invite-tab";
import { CohostsSection } from "../../components/manage/cohosts-tab";
import { QuickActions } from "../../components/manage/quick-actions";
import type { EventData } from "@/lib/types";

export const Route = createFileRoute("/manage/$eventId")({
  component: RouteComponent,
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: "/login" });
    }
  },
});

function RouteComponent() {
  const { eventId } = Route.useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEvent(eventId);
        if (active) setEvent(data);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Failed to load event");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [eventId]);

  const dt = useMemo(() => (event ? new Date(event.startDate) : null), [event]);
  const endDt = useMemo(
    () => (event?.endDate ? new Date(event.endDate) : null),
    [event]
  );

  const time = useMemo(
    () =>
      dt?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    [dt]
  );
  const dateLabel = useMemo(
    () => dt?.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
    [dt]
  );
  const endDateLabel = useMemo(
    () =>
      endDt?.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
      }) ?? null,
    [endDt]
  );

  const publicEventUrl = `${location.origin}/${eventId}`;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 w-full">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-8 w-1/2" />
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-60 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }
  if (!event) return null;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={cn(
                "capitalize",
                event.status === "PLANNING" && "border-sky-500/30 text-sky-400",
                event.status === "UPCOMING" &&
                  "border-emerald-500/30 text-emerald-400",
                event.status === "LIVE" && "border-rose-500/30 text-rose-400",
                event.status === "COMPLETED" &&
                  "border-zinc-500/30 text-zinc-400",
                event.status === "CANCELLED" && "border-red-500/30 text-red-400"
              )}
            >
              {event.status.toLowerCase()}
            </Badge>
            <span className="text-xs text-zinc-500">
              {event.type.toLowerCase()}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight truncate">
            {event.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {dateLabel}
            </span>
            {event.type === "ONE_OFF" && (
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
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(publicEventUrl);
              } catch {}
            }}
          >
            <LinkIcon className="h-4 w-4 mr-2" /> Copy link
          </Button>
        </div>
      </div>

      {/* Body: two columns */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs event={event} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            {event.coverImage ? (
              <img
                src={event.coverImage}
                alt={event.title}
                className="w-full h-44 object-cover"
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
          <QuickActions publicEventUrl={publicEventUrl} />
        </div>
      </div>
    </div>
  );
}

// ---------------- Tabs & Sections ----------------

type TabKey = "overview" | "polls" | "invites" | "cohosts" | "schedule";

function Tabs({ event }: { event: EventData }) {
  const [active, setActive] = useState<TabKey>("overview");
  const showSchedule = event.type === "WHOLE_DAY" || event.type === "MULTI_DAY";
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 mb-2 bg-transparent/50 backdrop-blur supports-[backdrop-filter]:bg-transparent/40">
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
          {(
            [
              ["overview", "Overview"],
              showSchedule ? (["schedule", "Schedule"] as const) : null,
              ["polls", "Polls"],
              ["invites", "Invites"],
              ["cohosts", "Co-hosts"],
            ].filter(Boolean) as ReadonlyArray<readonly [TabKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg transition",
                active === key
                  ? "bg-white shadow-sm dark:bg-zinc-800"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {active === "overview" && <OverviewSection />}
        {active === "schedule" && showSchedule && (
          <ScheduleSection event={event} />
        )}
        {active === "polls" && <PollsSection />}
        {active === "invites" && <InvitesSection />}
        {active === "cohosts" && <CohostsSection />}
      </div>
    </div>
  );
}
