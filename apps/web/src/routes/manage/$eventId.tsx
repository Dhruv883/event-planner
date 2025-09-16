import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { fetchEvent, type Event } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  Edit3,
  ExternalLink,
  Link as LinkIcon,
  MapPin,
  UserPlus,
  Users,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

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
  const [event, setEvent] = useState<Event | null>(null);
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

function Tabs({ event }: { event: Event }) {
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

type ActivityDraft = {
  title: string;
  time?: string;
  location?: string;
  description?: string;
};

function ScheduleSection({ event }: { event: Event }) {
  const isMulti = event.type === "MULTI_DAY";
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : null;

  const startOfDayUTC = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const enumerateDaysInclusiveUTC = (from: Date, to: Date) => {
    const days: Date[] = [];
    let cursor = startOfDayUTC(from);
    const last = startOfDayUTC(to);
    while (cursor.getTime() <= last.getTime()) {
      days.push(new Date(cursor));
      cursor = new Date(cursor);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
  };

  const days: Date[] = (() => {
    if (event.type === "WHOLE_DAY") return [start];
    if (isMulti && end) return enumerateDaysInclusiveUTC(start, end);
    return [start];
  })();

  const keyFor = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
  const [activitiesByDay, setActivitiesByDay] = useState<
    Record<string, ActivityDraft[]>
  >({});
  const [drafts, setDrafts] = useState<Record<string, ActivityDraft>>({});

  const addActivity = (dayKey: string) => {
    const d = drafts[dayKey] || { title: "" };
    const title = (d.title || "").trim();
    if (!title) return;
    setActivitiesByDay((prev) => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), { ...d }],
    }));
    setDrafts((prev) => ({
      ...prev,
      [dayKey]: { title: "", time: "", location: "", description: "" },
    }));
  };
  const removeActivity = (dayKey: string, idx: number) => {
    setActivitiesByDay((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="space-y-4">
      {days.map((d) => {
        const key = keyFor(d);
        const label = d.toLocaleDateString(undefined, {
          weekday: "short",
          day: "2-digit",
          month: "short",
        });
        const items = activitiesByDay[key] || [];
        return (
          <Card key={key} className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{label}</h3>
              <span className="text-xs text-zinc-500">
                {items.length} activities
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {items.map((act, i) => (
                <li key={i} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{act.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        {act.time && (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> {act.time}
                          </span>
                        )}
                        {act.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" /> {act.location}
                          </span>
                        )}
                      </div>
                      {act.description && (
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400 line-clamp-3">
                          {act.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeActivity(key, i)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
              {items.length === 0 && (
                <li className="text-sm text-zinc-500">No activities yet</li>
              )}
            </ul>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <Label htmlFor={`title-${key}`}>Title</Label>
                <Input
                  id={`title-${key}`}
                  placeholder="e.g., Lunch at 1pm"
                  value={drafts[key]?.title ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [key]: { ...(prev[key] || {}), title: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor={`time-${key}`}>Time</Label>
                <Input
                  id={`time-${key}`}
                  type="time"
                  placeholder="14:00"
                  value={drafts[key]?.time ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [key]: { ...(prev[key] || {}), time: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor={`loc-${key}`}>Location</Label>
                <Input
                  id={`loc-${key}`}
                  placeholder="Venue or address"
                  value={drafts[key]?.location ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [key]: { ...(prev[key] || {}), location: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="md:col-span-4">
                <Label htmlFor={`desc-${key}`}>Description</Label>
                <Textarea
                  id={`desc-${key}`}
                  placeholder="Details or notes"
                  value={drafts[key]?.description ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [key]: {
                        ...(prev[key] || {}),
                        description: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <Button onClick={() => addActivity(key)}>
                  <Plus className="h-4 w-4 mr-1" /> Add activity
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function OverviewSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-4">
        <h3 className="font-medium mb-2">Status & timeline</h3>
        <p className="text-sm text-zinc-500">
          Publish, cancel or mark as completed. (Coming soon)
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="default" disabled>
            <Check className="h-4 w-4 mr-1" /> Publish
          </Button>
          <Button size="sm" variant="outline" disabled>
            Cancel
          </Button>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="font-medium mb-2">Guests</h3>
        <p className="text-sm text-zinc-500">Invite and manage attendees.</p>
        <div className="mt-3">
          <Button size="sm" variant="secondary" disabled>
            <UserPlus className="h-4 w-4 mr-1" /> Invite guests
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Details are now handled on the dedicated edit page (/edit/$eventId)

function PollsSection() {
  const [kind, setKind] = useState<"date" | "activity">("date");
  const [options, setOptions] = useState<string[]>([""]);
  const [pollTitle, setPollTitle] = useState("");
  const [pollDesc, setPollDesc] = useState("");
  const setOption = (i: number, v: string) => {
    setOptions((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  };
  const add = () => setOptions((a) => [...a, ""]);
  const remove = (i: number) =>
    setOptions((arr) => arr.filter((_, idx) => idx !== i));

  return (
    <Card className="p-4">
      <h3 className="font-medium">Create a poll</h3>
      <p className="text-sm text-zinc-500 mb-4">
        Ask for preferred dates or activities. (Wiring coming soon)
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <Label htmlFor="poll-title">Title</Label>
          <Input
            id="poll-title"
            placeholder="e.g., When works for you?"
            value={pollTitle}
            onChange={(e) => setPollTitle(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="poll-desc">Description</Label>
          <Input
            id="poll-desc"
            placeholder="Optional context"
            value={pollDesc}
            onChange={(e) => setPollDesc(e.target.value)}
          />
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        <Button
          size="sm"
          variant={kind === "date" ? "secondary" : "outline"}
          onClick={() => setKind("date")}
        >
          Date
        </Button>
        <Button
          size="sm"
          variant={kind === "activity" ? "secondary" : "outline"}
          onClick={() => setKind("activity")}
        >
          Activity
        </Button>
      </div>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder={
                kind === "date"
                  ? `Date option ${i + 1} (e.g., 2025-09-20 6pm)`
                  : `Activity option ${i + 1}`
              }
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
            />
            <Button size="icon" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-4 w-4 mr-2" /> Add option
        </Button>
      </div>
      <div className="mt-4">
        <Button size="sm" disabled>
          Create poll
        </Button>
      </div>
    </Card>
  );
}

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function InvitesSection() {
  const [emails, setEmails] = useState<string[]>([]);
  const [val, setVal] = useState("");
  return (
    <Card className="p-4">
      <h3 className="font-medium">Invites</h3>
      <p className="text-sm text-zinc-500 mb-4">
        Share a link or invite by email. (Wiring coming soon)
      </p>
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="name@example.com"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <Button
          disabled={!isValidEmail(val)}
          onClick={() => {
            if (!val) return;
            setEmails((arr) => (arr.includes(val) ? arr : [...arr, val]));
            setVal("");
          }}
        >
          Add
        </Button>
      </div>
      <ul className="space-y-2">
        {emails.map((e, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-white/50 dark:bg-zinc-900/40"
          >
            <span>{e}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEmails((arr) => arr.filter((x) => x !== e))}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CohostsSection() {
  const [emails, setEmails] = useState<string[]>([]);
  const [val, setVal] = useState("");
  return (
    <Card className="p-4">
      <h3 className="font-medium">Co-hosts</h3>
      <p className="text-sm text-zinc-500 mb-4">
        Grant manage access to trusted friends. (Wiring coming soon)
      </p>
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="name@example.com"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <Button
          disabled={!isValidEmail(val)}
          onClick={() => {
            if (!val) return;
            setEmails((arr) => (arr.includes(val) ? arr : [...arr, val]));
            setVal("");
          }}
        >
          Add
        </Button>
      </div>
      <ul className="space-y-2">
        {emails.map((e, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-white/50 dark:bg-zinc-900/40"
          >
            <span>{e}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEmails((arr) => arr.filter((x) => x !== e))}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QuickActions({ publicEventUrl }: { publicEventUrl: string }) {
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-2">Quick actions</h3>
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(publicEventUrl);
            } catch {}
          }}
        >
          <LinkIcon className="h-4 w-4 mr-2" /> Copy public link
        </Button>
        <Link to="/$eventId" params={{ eventId: Route.useParams().eventId }}>
          <Button variant="outline" className="w-full justify-start">
            <ExternalLink className="h-4 w-4 mr-2" /> View public page
          </Button>
        </Link>
      </div>
    </Card>
  );
}
