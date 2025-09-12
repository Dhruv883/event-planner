import { useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarCheck, CalendarRange, FileText, MapPin } from "lucide-react";
import { toast } from "sonner";
import CoverBanner from "@/components/create/CoverBanner";
import CoverPicker from "@/components/create/CoverPicker";
import ScheduleFields from "@/components/create/ScheduleFields";

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

type CoverUrl = string;

const COVER_PRESETS: string[] = [
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688707/Connect/Cover%20Images/Preset/tech_zg81ne.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688707/Connect/Cover%20Images/Preset/pool_kons4c.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688706/Connect/Cover%20Images/Preset/lesgo_amt02r.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688706/Connect/Cover%20Images/Preset/bbq_hdpmju.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688706/Connect/Cover%20Images/Preset/camp_y9ymwf.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688706/Connect/Cover%20Images/Preset/hike_lk2s8k.avif",
];

function CreateEventPage() {
  const navigate = useNavigate();
  const [coverUrl, setCoverUrl] = useState<CoverUrl>(COVER_PRESETS[0] ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<EventType>("ONE_OFF");
  const [date, setDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadToCloudinary(file: File) {
    // const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as
    //   | string
    //   | undefined;
    // const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as
    //   | string
    //   | undefined;
    // if (cloudName && uploadPreset) {
    //   try {
    //     const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    //     const form = new FormData();
    //     form.append("file", file);
    //     form.append("upload_preset", uploadPreset);
    //     const res = await fetch(url, { method: "POST", body: form });
    //     if (!res.ok) throw new Error("Upload failed");
    //     const data = (await res.json()) as {
    //       secure_url?: string;
    //       url?: string;
    //     };
    //     return data.secure_url || data.url || "";
    //   } catch (e) {
    //     console.error("Cloudinary upload error", e);
    //     // fall through to local fallback below
    //   }
    // }
    // // Fallback for dev/local if Cloudinary not configured or upload failed
    // return URL.createObjectURL(file);
    console.log("uploaded to cloudinary");
  }

  async function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    // const file = e.target.files?.[0];
    // if (!file) return;
    // const uploaded = await uploadToCloudinary(file);
    // if (uploaded) setCoverUrl(uploaded);
    console.log("file uploaded");
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
      coverImage: coverUrl,
    };

    try {
      setSubmitting(true);
      const base = import.meta.env.VITE_SERVER_URL;
      const res = await fetch(`${base}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson?.error || `Failed to create event (${res.status})`
        );
      }
      const json = (await res.json()) as { data?: { id: string } };
      const id = json?.data?.id;
      toast.success("Event created");
      if (id) {
        navigate({ to: "/manage/$eventId", params: { eventId: id } });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Something went wrong creating the event");
    } finally {
      setSubmitting(false);
    }
  }

  function buildStartDateISO(type: EventType, date: string, startTime: string) {
    if (!date) return null;
    if (type === "ONE_OFF" && startTime)
      return new Date(`${date}T${startTime}:00`).toISOString();
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();
  }

  function buildEndDateISO(
    type: EventType,
    date: string,
    endDate: string,
    endTime: string
  ) {
    if (type === "ONE_OFF" && date && endTime)
      return new Date(`${date}T${endTime}:00`).toISOString();
    if (type === "WHOLE_DAY" && date) {
      const [y, m, d] = date.split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(Date.UTC(y, m - 1, d, 23, 59, 59)).toISOString();
    }
    if (type === "MULTI_DAY" && endDate) {
      const [y, m, d] = endDate.split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(Date.UTC(y, m - 1, d, 23, 59, 59)).toISOString();
    }
    return null;
  }

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6 pb-3 flex items-center justify-between">
        <CoverPicker
          coverUrl={coverUrl}
          presets={COVER_PRESETS}
          onPickUrl={(url) => setCoverUrl(url)}
          onPickUpload={() => fileInputRef.current?.click()}
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
        <CoverBanner url={coverUrl} />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-4"></div>

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
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              className="px-6"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create event"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
