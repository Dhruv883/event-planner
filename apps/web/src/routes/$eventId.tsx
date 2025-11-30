import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { fetchEvent } from "@/lib/api/events";
import { useEffect, useState } from "react";
import type { EventData } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$eventId")({
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
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await fetchEvent(eventId);
        if (!cancelled) setEvent(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
          <p className="text-zinc-400 mb-6">
            {error ||
              "This event doesn't exist or you don't have access to it."}
          </p>
          <Link to="/events">
            <Button variant="outline">Go to My Events</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const dt = new Date(event.startDate);
  const time = dt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateLabel = dt.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const endDt = event.endDate ? new Date(event.endDate) : null;
  const endDateLabel = endDt
    ? endDt.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const statusTheme = themeByStatus(event.status);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        {/* Event Cover */}
        <Card className="overflow-hidden border-0 shadow-2xl mb-6">
          {event.coverImage && (
            <div className="relative h-64 md:h-80 overflow-hidden">
              <img
                src={event.coverImage}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium backdrop-blur",
                    statusTheme.badge
                  )}
                >
                  {event.status}
                </span>
              </div>

              {/* Title on Image */}
              <div className="absolute bottom-4 left-4 right-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {event.title}
                </h1>
              </div>
            </div>
          )}

          {!event.coverImage && (
            <div className="p-6 bg-gradient-to-br from-zinc-800 to-zinc-900">
              <div className="flex justify-between items-start">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {event.title}
                </h1>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    statusTheme.badge
                  )}
                >
                  {event.status}
                </span>
              </div>
            </div>
          )}

          {/* Event Details */}
          <div className="p-6 space-y-6">
            {/* Date & Time */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-zinc-300">
                <Calendar className="h-5 w-5 text-zinc-500" />
                <div>
                  {event.type === "MULTI_DAY" && endDateLabel ? (
                    <span>
                      {dateLabel} — {endDateLabel}
                    </span>
                  ) : (
                    <span>{dateLabel}</span>
                  )}
                </div>
              </div>

              {event.type !== "WHOLE_DAY" && (
                <div className="flex items-center gap-3 text-zinc-300">
                  <Clock className="h-5 w-5 text-zinc-500" />
                  <span>{time}</span>
                </div>
              )}

              {event.type === "WHOLE_DAY" && (
                <div className="flex items-center gap-3 text-zinc-300">
                  <Clock className="h-5 w-5 text-zinc-500" />
                  <span>All day event</span>
                </div>
              )}

              {event.location && (
                <div className="flex items-center gap-3 text-zinc-300">
                  <MapPin className="h-5 w-5 text-zinc-500" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-400 mb-2">
                  About this event
                </h3>
                <p className="text-zinc-300 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Schedule Section for WHOLE_DAY and MULTI_DAY events */}
        {(event.type === "WHOLE_DAY" || event.type === "MULTI_DAY") &&
          event.days &&
          event.days.length > 0 && (
            <Card className="overflow-hidden border-0 shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-zinc-500" />
                Schedule
              </h2>
              <div className="space-y-6">
                {event.days.map((day) => {
                  const dayDate = new Date(day.date);
                  const dayLabel = dayDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  });

                  return (
                    <div key={day.id}>
                      <h3 className="text-sm font-medium text-zinc-400 mb-3">
                        {dayLabel}
                      </h3>
                      {day.activities.length === 0 ? (
                        <p className="text-zinc-500 text-sm italic">
                          No activities scheduled
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {day.activities.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex gap-4 p-3 rounded-lg bg-zinc-800/50"
                            >
                              {activity.startTime && (
                                <div className="flex-shrink-0 text-sm text-zinc-400 w-16">
                                  {new Date(
                                    activity.startTime
                                  ).toLocaleTimeString(undefined, {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white">
                                  {activity.title}
                                </h4>
                                {activity.description && (
                                  <p className="text-sm text-zinc-400 mt-1">
                                    {activity.description}
                                  </p>
                                )}
                                {activity.location && (
                                  <div className="flex items-center gap-1 text-sm text-zinc-500 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {activity.location}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
      </div>
    </div>
  );
}

function themeByStatus(status: EventData["status"]) {
  switch (status) {
    case "UPCOMING":
      return { badge: "bg-emerald-500/20 text-emerald-300" };
    case "LIVE":
      return { badge: "bg-rose-500/20 text-rose-300" };
    case "PLANNING":
      return { badge: "bg-sky-500/20 text-sky-300" };
    case "COMPLETED":
      return { badge: "bg-zinc-500/20 text-zinc-300" };
    case "CANCELLED":
      return { badge: "bg-red-500/20 text-red-300" };
    default:
      return { badge: "bg-slate-400/15 text-slate-300" };
  }
}
