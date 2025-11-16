import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, CheckCircle2, Lock } from "lucide-react";
import { createPoll, fetchPolls, votePoll, updatePoll } from "@/lib/api";
import type { PollDTO } from "@/lib/types";
import { toast } from "sonner";
// Removed ScrollArea/ScrollBar for a simpler, more compatible horizontal scroller

export function PollsSection({ eventId }: { eventId: string }) {
  const [kind, setKind] = useState<"date" | "activity">("date");
  const [options, setOptions] = useState<string[]>([""]);
  const [pollTitle, setPollTitle] = useState("");
  const [pollDesc, setPollDesc] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [voterPermission, setVoterPermission] = useState<
    "ALL_ATTENDEES" | "ACCEPTED_ATTENDEES" | "HOSTS_ONLY"
  >("ALL_ATTENDEES");
  const [resultVisibility, setResultVisibility] = useState<
    | "VISIBLE_TO_ALL"
    | "VISIBLE_TO_HOSTS_ONLY"
    | "VISIBLE_AFTER_VOTING"
    | "HIDDEN_UNTIL_CLOSED"
  >("VISIBLE_TO_ALL");
  // Expiry removed: manual closing only
  const [loading, setLoading] = useState(false);
  const [polls, setPolls] = useState<PollDTO[]>([]);
  const setOption = (i: number, v: string) => {
    setOptions((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  };
  const add = () => setOptions((a) => [...a, ""]);
  const remove = (i: number) =>
    setOptions((arr) => arr.filter((_, idx) => idx !== i));

  const preparedOptions = useMemo(
    () => options.map((o) => o.trim()).filter(Boolean),
    [options]
  );

  async function loadPolls() {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await fetchPolls(eventId);
      setPolls(data);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load polls");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function onCreate() {
    if (!eventId) return toast.error("Missing eventId in route");
    if (!pollTitle.trim()) return toast.error("Title is required");
    if (preparedOptions.length === 0)
      return toast.error("Add at least one option");
    try {
      setLoading(true);
      await createPoll(eventId, {
        title: pollTitle.trim(),
        description: pollDesc.trim() || null,
        options: preparedOptions,
        settings: {
          allowMultipleSelections: allowMultiple,
          voterPermission,
          resultVisibility,
        },
        // No expiry support
      });
      setPollTitle("");
      setPollDesc("");
      setOptions([""]);
      setAllowMultiple(false);
      setVoterPermission("ALL_ATTENDEES");
      setResultVisibility("VISIBLE_TO_ALL");
      // expiry cleared (not used)
      toast.success("Poll created");
      await loadPolls();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create poll");
    } finally {
      setLoading(false);
    }
  }

  async function onVote(
    pollId: string,
    optionId: string,
    multiple: boolean,
    current: string[]
  ) {
    if (!eventId) return;
    try {
      setLoading(true);
      let next: string[];
      if (multiple) {
        if (current.includes(optionId)) {
          const filtered = current.filter((id) => id !== optionId);
          if (filtered.length === 0) {
            setLoading(false);
            return;
          }
          next = filtered;
        } else {
          next = [...current, optionId];
        }
      } else {
        if (current.length === 1 && current[0] === optionId) {
          setLoading(false);
          return;
        }
        next = [optionId];
      }
      await votePoll(eventId, pollId, { optionIds: next });
      await loadPolls();
    } catch (e: any) {
      toast.error(e?.message || "Failed to vote");
    } finally {
      setLoading(false);
    }
  }

  const voterLabel = (v: string | undefined) =>
    v === "HOSTS_ONLY"
      ? "Hosts only"
      : v === "ACCEPTED_ATTENDEES"
        ? "Accepted attendees"
        : "All attendees";

  const resultsLabel = (v: string | undefined) =>
    v === "VISIBLE_TO_HOSTS_ONLY"
      ? "Hosts only"
      : v === "VISIBLE_AFTER_VOTING"
        ? "After voting"
        : v === "HIDDEN_UNTIL_CLOSED"
          ? "When closed"
          : "Visible to all";

  const isClosed = (p: PollDTO) => p.status !== "OPEN";

  const fmtDateTimeLocal = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <Card className="p-4">
      <div className="mb-2">
        <h3 className="font-medium">Create a poll</h3>
        <p className="text-sm text-zinc-500">
          Ask for preferred dates or activities.
        </p>
      </div>
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

      {/* Settings row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <Label htmlFor="voter-permission">Who can vote?</Label>
          <select
            id="voter-permission"
            className="mt-1 w-full rounded border px-2 py-2 bg-background"
            value={voterPermission}
            onChange={(e) => setVoterPermission(e.target.value as any)}
          >
            <option value="ALL_ATTENDEES">All invited attendees</option>
            <option value="ACCEPTED_ATTENDEES">Accepted attendees only</option>
            <option value="HOSTS_ONLY">Hosts only</option>
          </select>
        </div>
        <div>
          <Label htmlFor="result-visibility">Results visibility</Label>
          <select
            id="result-visibility"
            className="mt-1 w-full rounded border px-2 py-2 bg-background"
            value={resultVisibility}
            onChange={(e) => setResultVisibility(e.target.value as any)}
          >
            <option value="VISIBLE_TO_ALL">Visible to all</option>
            <option value="VISIBLE_TO_HOSTS_ONLY">Visible to hosts only</option>
            <option value="VISIBLE_AFTER_VOTING">Visible after voting</option>
            <option value="HIDDEN_UNTIL_CLOSED">Hidden until closed</option>
          </select>
        </div>
        {/* Expiry input removed */}
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
            <Button
              size="icon"
              variant="ghost"
              onClick={() => remove(i)}
              disabled={options.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-4 w-4 mr-2" /> Add option
        </Button>
      </div>
      <div className="mt-4">
        <Button
          size="sm"
          onClick={onCreate}
          disabled={
            loading || !pollTitle.trim() || preparedOptions.length === 0
          }
        >
          Create poll
        </Button>
      </div>
      <hr className="my-4" />
      <h4 className="font-medium mb-2">Existing polls</h4>
      {loading && polls.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : polls.length === 0 ? (
        <p className="text-sm text-zinc-500">No polls yet.</p>
      ) : (
        <div className="space-y-3">
          {polls.map((p) => {
            const multiple = !!p.settings?.allowMultipleSelections;
            const expired = false; // expiry removed
            const closed = isClosed(p);
            const total = p.options.reduce((acc, o) => acc + (o.count ?? 0), 0);
            return (
              <div key={p.id} className="rounded-xl border p-3 md:p-4">
                {/* Header Row */}
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h5
                      className="font-semibold text-base leading-snug truncate"
                      title={p.title}
                    >
                      {p.title}
                    </h5>
                    {p.description && (
                      <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-none">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          setLoading(true);
                          if (p.status === "OPEN") {
                            await updatePoll(eventId, p.id, {
                              status: "CLOSED",
                            });
                          } else {
                            await updatePoll(eventId, p.id, { status: "OPEN" });
                          }
                          await loadPolls();
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to update poll");
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      {p.status === "OPEN" ? "Close" : "Reopen"}
                    </Button>
                  </div>
                </div>

                {/* Chips Row (scrollable) */}
                <div className="mt-2 -mx-1 overflow-x-auto">
                  <div className="flex items-center gap-2 px-1 py-1 min-w-max">
                    {closed ? (
                      <span className="text-[11px] rounded-full px-2 py-0.5 inline-flex items-center gap-1 border bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700">
                        <Lock size={12} /> Closed
                      </span>
                    ) : (
                      <span className="text-[11px] rounded-full px-2 py-0.5 border bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">
                        Open
                      </span>
                    )}
                    <span className="text-[11px] rounded-full px-2 py-0.5 border bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700 whitespace-nowrap">
                      {multiple ? "Multiple" : "Single"} choice
                    </span>
                    <span className="text-[11px] rounded-full px-2 py-0.5 border bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700 whitespace-nowrap">
                      Voters: {voterLabel(p.settings?.voterPermission as any)}
                    </span>
                    <span className="text-[11px] rounded-full px-2 py-0.5 border bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700 whitespace-nowrap">
                      Results:{" "}
                      {resultsLabel(p.settings?.resultVisibility as any)}
                    </span>
                    {/* No expiry timestamp */}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                  <span className="opacity-70">
                    Settings are fixed after creation.
                  </span>
                  {/* Expiry editor removed */}
                </div>
                <div className="mt-2 space-y-2">
                  {p.options.map((o) => {
                    const selected = p.mySelections.includes(o.id);
                    const count = o.count ?? 0;
                    const pct =
                      total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <button
                        key={o.id}
                        className={`w-full rounded border px-3 py-2 text-left group transition-colors ${selected ? "bg-zinc-50 dark:bg-zinc-900/50" : "bg-white dark:bg-zinc-900"} border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed`}
                        onClick={() =>
                          onVote(p.id, o.id, multiple, p.mySelections)
                        }
                        disabled={loading || closed}
                        aria-pressed={selected}
                      >
                        <div className="flex items-start gap-2">
                          <CheckCircle2
                            size={18}
                            className={`${selected ? "text-emerald-500" : "text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400"}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{o.text}</span>
                              {typeof o.count === "number" && (
                                <span className="text-[11px] text-zinc-600">
                                  {count}
                                  {total > 0 ? ` • ${pct}%` : ""}
                                </span>
                              )}
                            </div>
                            {typeof o.count === "number" && (
                              <div className="mt-1 h-2 w-full rounded bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 dark:bg-emerald-600"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {p.options.every((o) => typeof o.count === "undefined") && (
                    <p className="text-xs text-zinc-500">
                      Results hidden for now.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
