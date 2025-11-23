import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { fetchEvent } from "@/lib/api/events";
import { useEffect, useState, useCallback } from "react";
import { EventHeader } from "../../components/manage/event-header";
import { ManageTabs } from "../../components/manage/manage-tabs";
import type { EventData } from "@/lib/types";
import Skeleton from "@/components/manage/skeleton";
import { EventPreview } from "@/components/manage/event-preview";

const getEventDateInfo = (event: EventData | null) => {
  if (!event) {
    return {
      date: null as Date | null,
      endDate: null as Date | null,
      time: null as string | null,
      dateLabel: null as string | null,
      endDateLabel: null as string | null,
    };
  }

  const date = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateLabel = date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
  const endDateLabel = endDate
    ? endDate.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
    : null;

  return { date, endDate, time, dateLabel, endDateLabel };
};

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
  const [copyState, setCopyState] = useState({ copied: false, error: false });

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

  const { dateLabel, endDateLabel, time } = getEventDateInfo(event);

  const publicEventUrl = `${location.origin}/${eventId}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicEventUrl);
      setCopyState({ copied: true, error: false });
    } catch {
      setCopyState({ copied: true, error: true });
    }
  }, [publicEventUrl]);

  useEffect(() => {
    if (copyState.copied) {
      const id = setTimeout(
        () => setCopyState({ copied: false, error: false }),
        2000
      );
      return () => clearTimeout(id);
    }
  }, [copyState.copied]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (loading || !event) {
    return <Skeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <EventHeader
        event={event}
        dateLabel={dateLabel}
        endDateLabel={endDateLabel}
        time={time}
        onCopyLink={handleCopyLink}
        copyState={copyState}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ManageTabs event={event} />
        </div>
        <EventPreview event={event} />
      </div>
    </div>
  );
}
