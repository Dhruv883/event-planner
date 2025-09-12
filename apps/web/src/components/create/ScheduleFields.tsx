import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EventType = "ONE_OFF" | "WHOLE_DAY" | "MULTI_DAY";

export function ScheduleFields({
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

export function Field({
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

export default ScheduleFields;
