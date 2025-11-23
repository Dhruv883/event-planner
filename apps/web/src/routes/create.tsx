import { useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { createEvent } from "@/lib/api/events";
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
import CoverBanner from "@/components/create/cover-banner";
import CoverPicker from "@/components/create/cover-picker";
import ScheduleFields from "@/components/create/schedule-fields";
import type { CreateEventPayload } from "@/lib/types";

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

const COVER_PRESETS: string[] = [
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688707/Connect/Cover%20Images/Preset/tech_zg81ne.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688707/Connect/Cover%20Images/Preset/pool_kons4c.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688706/Connect/Cover%20Images/Preset/lesgo_amt02r.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688706/Connect/Cover%20Images/Preset/bbq_hdpmju.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688706/Connect/Cover%20Images/Preset/camp_y9ymwf.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1757688706/Connect/Cover%20Images/Preset/hike_lk2s8k.avif",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1759393133/Connect/Cover%20Images/Preset/Porsche_anime_wallpaper___Ghibli_Art_odpju7.jpg",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1759393133/Connect/Cover%20Images/Preset/download_j1sbf5.jpg",
  "https://res.cloudinary.com/do2a6xog2/image/upload/v1759393133/Connect/Cover%20Images/Preset/Mercedes-Benz_G63_fjan1x.jpg",
];

function CreateEventPage() {
  const navigate = useNavigate();
  const [coverUrl, setCoverUrl] = useState<string>(COVER_PRESETS[0]);
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

  // async function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
  //   console.log("file uploaded");
  // }

  function validate(): string | null {
    if (!title) {
      return "Title is required";
    }

    if (!date) {
      return type === "MULTI_DAY"
        ? "Start date is required"
        : "Date is required";
    }

    if (type === "MULTI_DAY") {
      if (endDate && endDate < date) {
        return "End date must be after start date";
      }
    }

    if (type === "ONE_OFF") {
      if (!startTime) return "Start time is required";
      if (!endTime) return "End time is required";
      if (startTime >= endTime) return "End time must be after start time";
    }

    return null;
  }

  function buildStartDateISO(
    type: EventType,
    date: string,
    startTime: string
  ): string | null {
    if (!date) {
      return null;
    }

    if (type === "ONE_OFF" && startTime) {
      return new Date(`${date}T${startTime}:00`).toISOString();
    }

    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) {
      return null;
    }

    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString();
  }

  function buildEndDateISO(
    type: EventType,
    date: string,
    endDate: string,
    endTime: string
  ): string | null {
    if (type === "ONE_OFF" && date && endTime) {
      return new Date(`${date}T${endTime}:00`).toISOString();
    }

    if (type === "WHOLE_DAY" && date) {
      const [year, month, day] = date.split("-").map(Number);
      if (!year || !month || !day) {
        return null;
      }
      return new Date(Date.UTC(year, month - 1, day, 23, 59, 59)).toISOString();
    }

    if (type === "MULTI_DAY" && endDate) {
      const [year, month, day] = endDate.split("-").map(Number);
      if (!year || !month || !day) {
        return null;
      }
      return new Date(Date.UTC(year, month - 1, day, 23, 59, 59)).toISOString();
    }

    return null;
  }

  async function handleCreate() {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const eventPayload: CreateEventPayload = {
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

      const eventId = await createEvent(eventPayload);
      toast.success("Event created successfully!");

      navigate({ to: "/manage/$eventId", params: { eventId } });
    } catch (error: any) {
      const errorMessage =
        error?.message || "Failed to create event. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
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
        {/* <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUploadFile}
        /> */}
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
                  <ToggleGroupItem value="ONE_OFF" aria-label="One-Off">
                    <CalendarCheck className="mr-2 size-4" /> One-Off
                  </ToggleGroupItem>
                  <ToggleGroupItem value="WHOLE_DAY" aria-label="Whole-Day">
                    <CalendarCheck className="mr-2 size-4 opacity-70" /> Whole
                    Day
                  </ToggleGroupItem>
                  <ToggleGroupItem value="MULTI_DAY" aria-label="Multi-Day">
                    <CalendarRange className="mr-2 size-4" /> Multi‑Day
                  </ToggleGroupItem>
                </ToggleGroup>
              </CardAction>
              <CardDescription>
                Pick Dates and Times based on Event Type
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
