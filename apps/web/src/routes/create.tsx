import { useMemo, useRef, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CalendarCheck,
  CalendarRange,
  Check,
  FileText,
  Clock,
  Image as ImageIcon,
  MapPin,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/create")({
  component: RouteComponent,
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: "/login" });
    }
  },
});

function RouteComponent() {
  return <CreateEventPage />;
}

type EventType = "ONE_OFF" | "WHOLE_DAY" | "MULTI_DAY";

type CoverKind =
  | { kind: "preset"; id: string; className: string }
  | { kind: "upload"; url: string };

const COVER_PRESETS: Array<{ id: string; name: string; className: string }> = [
  {
    id: "aurora",
    name: "Aurora",
    className:
      "bg-[radial-gradient(1000px_400px_at_0%_0%,#6EE7B7_0%,transparent_60%),radial-gradient(800px_300px_at_100%_0%,#93C5FD_0%,transparent_60%),radial-gradient(1000px_400px_at_50%_100%,#FCA5A5_0%,transparent_60%)]",
  },
  {
    id: "sunset",
    name: "Sunset",
    className: "bg-gradient-to-br from-rose-500 via-fuchsia-500 to-indigo-500",
  },
  {
    id: "ocean",
    name: "Ocean",
    className: "bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600",
  },
  {
    id: "forest",
    name: "Forest",
    className: "bg-gradient-to-tr from-emerald-500 via-teal-500 to-lime-500",
  },
  {
    id: "haze",
    name: "Haze",
    className:
      "bg-[conic-gradient(at_0%_0%,#e879f9_0deg,#60a5fa_120deg,#34d399_240deg,#e879f9_360deg)]",
  },
  {
    id: "midnight",
    name: "Midnight",
    className: "bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-800",
  },
  {
    id: "candy",
    name: "Candy",
    className: "bg-gradient-to-br from-pink-400 via-amber-300 to-rose-400",
  },
  {
    id: "flare",
    name: "Flare",
    className:
      "bg-[radial-gradient(circle_at_20%_10%,rgba(250,204,21,0.6),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(244,63,94,0.5),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.5),transparent_40%)]",
  },
];

function CreateEventPage() {
  const [cover, setCover] = useState<CoverKind>({
    kind: "preset",
    id: COVER_PRESETS[0].id,
    className: COVER_PRESETS[0].className,
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<EventType>("ONE_OFF");
  const [date, setDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPresetName = useMemo(() => {
    if (cover.kind !== "preset") return "Custom photo";
    return (
      COVER_PRESETS.find((preset) => preset.id === cover.id)?.name ?? "Cover"
    );
  }, [cover]);

  function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCover({ kind: "upload", url });
  }

  function validate(): string | null {
    if (!title.trim()) return "Title is required";
    if (!date)
      return type === "MULTI_DAY"
        ? "Start date is required"
        : "Date is required";
    if (type === "MULTI_DAY" && endDate && endDate < date)
      return "End date must be after start date";
    if (type === "ONE_OFF") {
      if (!startTime || !endTime) return "Start and end time are required";
      if (startTime >= endTime) return "End time must be after start time";
    }
    return null;
  }

  async function handleCreate() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const payload = {
      title,
      description,
      location,
      type,
      startDate: buildStartDateISO(type, date, startTime),
      endDate: buildEndDateISO(type, date, endDate, endTime),
      coverImage:
        cover.kind === "upload" ? cover.url : `preset:${(cover as any).id}`,
    };

    console.log(payload);
  }

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6 pb-3 flex items-center justify-between">
        <CoverPicker
          cover={cover}
          onPickPreset={(preset) =>
            setCover({
              kind: "preset",
              id: preset.id,
              className: preset.className,
            })
          }
          onPickUpload={() => fileInputRef.current?.click()}
          selectedLabel={selectedPresetName}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUploadFile}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6">
        <CoverBanner cover={cover} label={selectedPresetName} />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-4">
        <StepsBar
          coverDone={true}
          detailsDone={Boolean(title.trim())}
          scheduleDone={isScheduleComplete(
            type,
            date,
            endDate,
            startTime,
            endTime
          )}
        />
      </div>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-6">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </div>
                <div>
                  <CardTitle>Details</CardTitle>
                  <CardDescription>
                    Make it informative and inviting
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Give it a catchy name"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="location"
                      className="pl-9"
                      placeholder="Add a venue, link, or pin"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this event about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
                <div className="text-xs text-muted-foreground">
                  Tip: Add agenda, who should attend, and anything to bring.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="items-start gap-3">
              <CardTitle>Schedule</CardTitle>
              <CardAction>
                <ToggleGroup
                  type="single"
                  value={type}
                  onValueChange={(val) => val && setType(val as EventType)}
                  className="inline-flex gap-1 rounded-md border p-1"
                >
                  <ToggleGroupItem value="ONE_OFF" aria-label="One-off">
                    <CalendarCheck className="mr-2 size-4" /> One‑off
                  </ToggleGroupItem>
                  <ToggleGroupItem value="WHOLE_DAY" aria-label="Whole day">
                    <CalendarCheck className="mr-2 size-4 opacity-70" /> Whole
                    day
                  </ToggleGroupItem>
                  <ToggleGroupItem value="MULTI_DAY" aria-label="Multi-day">
                    <CalendarRange className="mr-2 size-4" /> Multi‑day
                  </ToggleGroupItem>
                </ToggleGroup>
              </CardAction>
              <CardDescription>
                Pick dates and times based on type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-3">
                <ScheduleFields
                  type={type}
                  date={date}
                  endDate={endDate}
                  startTime={startTime}
                  endTime={endTime}
                  onChange={{ setDate, setEndDate, setStartTime, setEndTime }}
                />
              </div>
              {/* Summary bar */}
              <div className="mt-3 flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  <span>
                    {scheduleSummaryText(
                      type,
                      date,
                      endDate,
                      startTime,
                      endTime
                    )}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleCreate} className="px-6">
              Create event
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildStartDateISO(type: EventType, date: string, startTime: string) {
  if (!date) return null;
  if (type === "ONE_OFF" && startTime)
    return new Date(`${date}T${startTime}:00`).toISOString();
  return new Date(`${date}T00:00:00`).toISOString();
}

function buildEndDateISO(
  type: EventType,
  date: string,
  endDate: string,
  endTime: string
) {
  if (type === "ONE_OFF" && date && endTime)
    return new Date(`${date}T${endTime}:00`).toISOString();
  if (type === "WHOLE_DAY" && date)
    return new Date(`${date}T23:59:59`).toISOString();
  if (type === "MULTI_DAY" && endDate)
    return new Date(`${endDate}T23:59:59`).toISOString();
  return null;
}

// Simple completion check for steps bar
function isScheduleComplete(
  type: EventType,
  date: string,
  endDate: string,
  startTime: string,
  endTime: string
) {
  if (!date) return false;
  if (type === "ONE_OFF")
    return Boolean(startTime && endTime && startTime < endTime);
  if (type === "MULTI_DAY") return Boolean(endDate && endDate >= date);
  return true; // WHOLE_DAY with date
}

function scheduleSummaryText(
  type: EventType,
  date: string,
  endDate: string,
  startTime: string,
  endTime: string
) {
  if (!date) return "Pick a date";
  const prettyDate = formatISODate(date);
  if (type === "ONE_OFF") {
    if (!startTime || !endTime) return `${prettyDate} • Set time`;
    return `${prettyDate} • ${startTime}–${endTime}`;
  }
  if (type === "WHOLE_DAY") return `${prettyDate} • All day`;
  // MULTI_DAY
  if (!endDate) return `${prettyDate} → ?`;
  return `${prettyDate} → ${formatISODate(endDate)}`;
}

function formatISODate(dateStr: string) {
  try {
    const dt = new Date(`${dateStr}T00:00:00`);
    return dt.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function StepsBar({
  coverDone,
  detailsDone,
  scheduleDone,
}: {
  coverDone: boolean;
  detailsDone: boolean;
  scheduleDone: boolean;
}) {
  const Step = ({
    done,
    label,
    icon,
  }: {
    done: boolean;
    label: string;
    icon: React.ReactNode;
  }) => (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "grid size-7 place-items-center rounded-full border",
          done
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted text-foreground"
        )}
      >
        {done ? <Check className="size-4" /> : icon}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-4 overflow-x-auto rounded-md border bg-muted/30 px-3 py-2">
      <Step
        done={coverDone}
        label="Cover"
        icon={<ImageIcon className="size-4" />}
      />
      <div className="text-muted-foreground/50">—</div>
      <Step
        done={detailsDone}
        label="Details"
        icon={<FileText className="size-4" />}
      />
      <div className="text-muted-foreground/50">—</div>
      <Step
        done={scheduleDone}
        label="Schedule"
        icon={<CalendarCheck className="size-4" />}
      />
    </div>
  );
}

function ScheduleFields({
  type,
  date,
  endDate,
  startTime,
  endTime,
  onChange,
}: {
  type: EventType;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  onChange: {
    setDate: (v: string) => void;
    setEndDate: (v: string) => void;
    setStartTime: (v: string) => void;
    setEndTime: (v: string) => void;
  };
}) {
  return (
    <div className="grid gap-4">
      {type === "ONE_OFF" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Date">
            <Input
              type="date"
              value={date}
              onChange={(e) => onChange.setDate(e.target.value)}
            />
          </Field>
          <Field label="Start time">
            <Input
              type="time"
              value={startTime}
              onChange={(e) => onChange.setStartTime(e.target.value)}
            />
          </Field>
          <Field label="End time">
            <Input
              type="time"
              value={endTime}
              onChange={(e) => onChange.setEndTime(e.target.value)}
            />
          </Field>
        </div>
      )}

      {type === "WHOLE_DAY" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Date">
            <Input
              type="date"
              value={date}
              onChange={(e) => onChange.setDate(e.target.value)}
            />
          </Field>
          <div className="flex items-end text-sm text-muted-foreground">
            This event spans the entire day
          </div>
        </div>
      )}

      {type === "MULTI_DAY" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Start date">
            <Input
              type="date"
              value={date}
              onChange={(e) => onChange.setDate(e.target.value)}
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onChange.setEndDate(e.target.value)}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CoverPicker({
  cover,
  onPickPreset,
  onPickUpload,
  selectedLabel,
}: {
  cover: CoverKind;
  onPickPreset: (preset: { id: string; className: string }) => void;
  onPickUpload: () => void;
  selectedLabel: string;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ImageIcon className="size-4" /> Change cover
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-4xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border bg-background shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <DialogPrimitive.Title className="text-foreground text-sm font-semibold">
                Choose Image
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="rounded-xs p-1 opacity-70 transition-opacity hover:opacity-100">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div
                role="button"
                tabIndex={0}
                onClick={onPickUpload}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onPickUpload();
                }}
                className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center"
              >
                <div className="text-sm font-medium">
                  Drag & drop or click here to upload.
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Or choose an image below. The ideal aspect ratio is 1:1.
                </div>
              </div>

              <div className="mt-4">
                <Input
                  placeholder="Search for more photos"
                  className="w-full"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {COVER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPickPreset(p)}
                    className={cn(
                      "relative aspect-[16/10] w-full overflow-hidden rounded-md border",
                      cover.kind === "preset" && (cover as any).id === p.id
                        ? "ring-2 ring-primary"
                        : ""
                    )}
                    aria-label={`Choose ${p.name}`}
                  >
                    <div className={cn("absolute inset-0", p.className)} />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-2 text-left text-xs font-medium text-white">
                      {p.name}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Selected: {selectedLabel}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CoverBanner({ cover, label }: { cover: CoverKind; label: string }) {
  const bgStyle =
    cover.kind === "upload"
      ? {
          backgroundImage: `url(${cover.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;
  return (
    <div className="relative w-full overflow-hidden rounded-xl border">
      <div
        className={cn(
          "aspect-[16/5] w-full",
          cover.kind === "preset" ? cover.className : "bg-black"
        )}
        style={bgStyle}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
      <div className="absolute bottom-2 right-2 rounded-md bg-background/80 px-2 py-1 text-xs shadow-sm ring-1 ring-border">
        Cover: {label}
      </div>
    </div>
  );
}
