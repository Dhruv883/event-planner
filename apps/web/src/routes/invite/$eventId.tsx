import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fetchEventPublicPreview, joinEvent } from "@/lib/api/events";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { EventPublicPreview } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  CheckCircle,
  Loader2,
  AlertCircle,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/invite/$eventId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [event, setEvent] = useState<EventPublicPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinStatus, setJoinStatus] = useState<
    "idle" | "pending" | "accepted" | "error"
  >("idle");
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await fetchEventPublicPreview(eventId);
        if (!cancelled) setEvent(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Event not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleJoin = async () => {
    if (!session) {
      // Redirect to login with return URL
      navigate({ to: "/login", search: { redirect: `/invite/${eventId}` } });
      return;
    }

    setJoining(true);
    setJoinError(null);
    try {
      const result = await joinEvent(eventId);
      if (result.status === "ACCEPTED") {
        setJoinStatus("accepted");
        // Redirect to event page after a short delay
        setTimeout(() => {
          navigate({ to: "/$eventId", params: { eventId } });
        }, 1500);
      } else if (result.status === "PENDING") {
        setJoinStatus("pending");
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join event");
      setJoinStatus("error");
    } finally {
      setJoining(false);
    }
  };
  console.log("hereeee mf");

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
            {error || "This event doesn't exist or the link may be invalid."}
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

  const hostInitials =
    event.host.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "H";

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Event Cover */}
        <Card className="overflow-hidden border-0 shadow-2xl">
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
                    event.status === "UPCOMING" &&
                      "bg-emerald-500/20 text-emerald-300",
                    event.status === "LIVE" && "bg-rose-500/20 text-rose-300",
                    event.status === "PLANNING" && "bg-sky-500/20 text-sky-300",
                    event.status === "COMPLETED" &&
                      "bg-zinc-500/20 text-zinc-300",
                    event.status === "CANCELLED" && "bg-red-500/20 text-red-300"
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
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {event.title}
              </h1>
            </div>
          )}

          {/* Event Details */}
          <div className="p-6 space-y-6">
            {/* Host Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {event.host.image ? (
                  <AvatarImage
                    src={event.host.image}
                    alt={event.host.name || "Host"}
                  />
                ) : (
                  <AvatarFallback className="bg-zinc-700 text-white">
                    {hostInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="text-sm text-zinc-400">Hosted by</p>
                <p className="font-medium">{event.host.name || "Event Host"}</p>
              </div>
            </div>

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

              <div className="flex items-center gap-3 text-zinc-300">
                <Users className="h-5 w-5 text-zinc-500" />
                <span>
                  {event.attendeeCount}{" "}
                  {event.attendeeCount === 1 ? "attendee" : "attendees"}
                </span>
              </div>
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

            {/* Join Section */}
            <div className="pt-6 border-t border-zinc-800">
              {joinStatus === "idle" && (
                <>
                  {event.requireApproval && (
                    <p className="text-sm text-amber-400 mb-4 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      This event requires approval from the host
                    </p>
                  )}
                  <Button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full h-12 text-lg"
                    size="lg"
                  >
                    {joining ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : session ? (
                      <>
                        <PartyPopper className="h-5 w-5 mr-2" />
                        {event.requireApproval
                          ? "Request to Join"
                          : "Join Event"}
                      </>
                    ) : (
                      <>
                        <PartyPopper className="h-5 w-5 mr-2" />
                        Sign in to Join
                      </>
                    )}
                  </Button>
                </>
              )}

              {joinStatus === "accepted" && (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
                  <h3 className="text-xl font-semibold text-emerald-400 mb-2">
                    You're in!
                  </h3>
                  <p className="text-zinc-400">
                    Redirecting to event details...
                  </p>
                </div>
              )}

              {joinStatus === "pending" && (
                <div className="text-center py-4">
                  <Clock className="h-12 w-12 mx-auto text-amber-500 mb-3" />
                  <h3 className="text-xl font-semibold text-amber-400 mb-2">
                    Request Sent!
                  </h3>
                  <p className="text-zinc-400">
                    The host will review your request. You'll be notified once
                    approved.
                  </p>
                  <Link to="/events" className="mt-4 inline-block">
                    <Button variant="outline">Go to My Events</Button>
                  </Link>
                </div>
              )}

              {joinStatus === "error" && (
                <div className="text-center py-4">
                  <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-3" />
                  <h3 className="text-xl font-semibold text-red-400 mb-2">
                    Something went wrong
                  </h3>
                  <p className="text-zinc-400 mb-4">
                    {joinError || "Failed to join the event"}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setJoinStatus("idle");
                      setJoinError(null);
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
