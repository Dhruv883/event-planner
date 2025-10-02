import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import type { Activity } from "@/types";

interface ActivityFormProps {
  dayId: string;
  draft: Activity;
  onDraftChange: (draft: Activity) => void;
  onAdd: () => Promise<void>;
  isLoading: boolean;
}

export function ActivityForm({
  dayId,
  draft,
  onDraftChange,
  onAdd,
  isLoading,
}: ActivityFormProps) {
  const updateDraft = (field: keyof Activity, value: string) => {
    onDraftChange({ ...draft, [field]: value });
  };

  return (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
      <div className="md:col-span-2">
        <Label htmlFor={`title-${dayId}`}>Title</Label>
        <Input
          id={`title-${dayId}`}
          placeholder="e.g., Lunch at 1pm"
          value={draft.title}
          onChange={(e) => updateDraft("title", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`start-${dayId}`}>Start</Label>
        <Input
          id={`start-${dayId}`}
          type="time"
          value={draft.startTime || ""}
          onChange={(e) => updateDraft("startTime", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`end-${dayId}`}>End</Label>
        <Input
          id={`end-${dayId}`}
          type="time"
          value={draft.endTime || ""}
          onChange={(e) => updateDraft("endTime", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`loc-${dayId}`}>Location</Label>
        <Input
          id={`loc-${dayId}`}
          placeholder="Venue or address"
          value={draft.location || ""}
          onChange={(e) => updateDraft("location", e.target.value)}
        />
      </div>
      <div className="md:col-span-4">
        <Label htmlFor={`desc-${dayId}`}>Description</Label>
        <Textarea
          id={`desc-${dayId}`}
          placeholder="Details or notes"
          value={draft.description || ""}
          onChange={(e) => updateDraft("description", e.target.value)}
        />
      </div>
      <div className="md:col-span-4 flex justify-end">
        <Button onClick={onAdd} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          {isLoading ? "Saving..." : "Add activity"}
        </Button>
      </div>
    </div>
  );
}
