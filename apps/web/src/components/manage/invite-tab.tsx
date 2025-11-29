import {
  fetchEventAttendees,
  approveAttendee,
  declineAttendee,
  bulkDecideAttendees,
} from "@/lib/api/attendees";
import type { BulkAttendeeDecision } from "@/lib/api/attendees";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventData, EventAttendeesResponse } from "@/lib/types";
import { authClient } from "@/lib/auth-client";

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

interface InvitesSectionProps {
  event: EventData;
}

export function InvitesSection({ event }: InvitesSectionProps) {
  const [emails, setEmails] = useState<string[]>([]); // placeholder for future email invite wiring
  const [val, setVal] = useState("");
  const [attendees, setAttendees] = useState<EventAttendeesResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDeclineAllConfirm, setShowDeclineAllConfirm] = useState(false);
  const { data: session } = authClient.useSession();
  const isHost = session?.user.id === event.hostId; // co-host visibility handled server-side

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await fetchEventAttendees(event.id);
        if (!cancelled) setAttendees(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load attendees");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id]);

  const publicEventUrl = `${location.origin}/${event.id}`;

  return (
    <Card className="p-4 space-y-5">
      <div className="space-y-1">
        <h3 className="font-medium">Invites & Attendees</h3>
        <p className="text-sm text-zinc-500">
          Share the public event link below. Attendees join directly;{" "}
          {attendees?.requireApproval
            ? " requests will appear as pending until you approve."
            : " they are added immediately since approval is not required."}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input readOnly value={publicEventUrl} className="text-xs" />
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(publicEventUrl);
            } catch {}
          }}
        >
          Copy Link
        </Button>
      </div>

      {attendees?.requireApproval && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Pending Requests</h4>
          {attendees && attendees.groups.pending.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {selected.size > 0 ? (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={actioning === "__bulkApprove"}
                    onClick={async () => {
                      try {
                        setActioning("__bulkApprove");
                        const decisions: BulkAttendeeDecision[] = Array.from(
                          selected
                        ).map((userId) => ({ userId, decision: "APPROVE" }));
                        await bulkDecideAttendees(event.id, decisions);
                        const data = await fetchEventAttendees(event.id);
                        setAttendees(data);
                        setSelected(new Set());
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Failed bulk approve"
                        );
                      } finally {
                        setActioning(null);
                      }
                    }}
                  >
                    Approve Selected ({selected.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actioning === "__bulkDecline"}
                    onClick={async () => {
                      try {
                        setActioning("__bulkDecline");
                        const decisions: BulkAttendeeDecision[] = Array.from(
                          selected
                        ).map((userId) => ({ userId, decision: "DECLINE" }));
                        await bulkDecideAttendees(event.id, decisions);
                        const data = await fetchEventAttendees(event.id);
                        setAttendees(data);
                        setSelected(new Set());
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Failed bulk decline"
                        );
                      } finally {
                        setActioning(null);
                      }
                    }}
                  >
                    Decline Selected ({selected.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={actioning !== null}
                    onClick={() => setSelected(new Set())}
                  >
                    Clear Selection
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={actioning === "__approveAll"}
                    onClick={async () => {
                      try {
                        setActioning("__approveAll");
                        const pendingIds = attendees.groups.pending.map(
                          (a) => a.userId
                        );
                        const decisions: BulkAttendeeDecision[] =
                          pendingIds.map((userId) => ({
                            userId,
                            decision: "APPROVE",
                          }));
                        if (decisions.length) {
                          await bulkDecideAttendees(event.id, decisions);
                          const data = await fetchEventAttendees(event.id);
                          setAttendees(data);
                        }
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Failed to approve all"
                        );
                      } finally {
                        setActioning(null);
                      }
                    }}
                  >
                    Approve All
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actioning === "__declineAll"}
                    onClick={() => setShowDeclineAllConfirm(true)}
                  >
                    Decline All
                  </Button>
                </>
              )}
            </div>
          )}
          {loading && !attendees && (
            <p className="text-xs text-zinc-500">Loading...</p>
          )}
          <ul className="space-y-2">
            {attendees?.groups.pending.map((a) => {
              const disabled = actioning === a.userId;
              const isSelected = selected.has(a.userId);
              return (
                <li
                  key={a.userId}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs bg-white/50 dark:bg-zinc-900/40"
                >
                  <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-zinc-700 dark:accent-zinc-300 shrink-0"
                      checked={isSelected}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(a.userId);
                          else next.delete(a.userId);
                          return next;
                        });
                      }}
                    />
                    <span className="truncate">
                      {a.user.name || a.user.email || a.userId}
                    </span>
                  </label>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={async () => {
                        try {
                          setActioning(a.userId);
                          await approveAttendee(event.id, a.userId);
                          const data = await fetchEventAttendees(event.id);
                          setAttendees(data);
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "Failed to approve"
                          );
                        } finally {
                          setActioning(null);
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={disabled}
                      onClick={async () => {
                        try {
                          setActioning(a.userId);
                          await declineAttendee(event.id, a.userId);
                          const data = await fetchEventAttendees(event.id);
                          setAttendees(data);
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "Failed to decline"
                          );
                        } finally {
                          setActioning(null);
                        }
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              );
            })}
            {attendees && attendees.groups.pending.length === 0 && (
              <p className="text-xs text-zinc-500">No pending requests.</p>
            )}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Accepted Attendees</h4>
        <ul className="space-y-2 text-xs">
          {attendees?.groups.accepted.map((a) => (
            <li
              key={a.userId}
              className="flex items-center justify-between rounded-md border px-3 py-2 bg-white/50 dark:bg-zinc-900/40"
            >
              <span>{a.user.name || a.user.email || a.userId}</span>
              <span className="text-[10px] uppercase tracking-wide">
                ACCEPTED
              </span>
            </li>
          ))}
          {attendees && attendees.groups.accepted.length === 0 && (
            <p className="text-xs text-zinc-500">None yet.</p>
          )}
        </ul>
      </div>

      {attendees?.requireApproval && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Declined Requests</h4>
          <ul className="space-y-2 text-xs">
            {attendees?.groups.declined.map((a) => (
              <li
                key={a.userId}
                className="flex items-center justify-between rounded-md border px-3 py-2 bg-white/50 dark:bg-zinc-900/40"
              >
                <span>{a.user.name || a.user.email || a.userId}</span>
                <span className="text-[10px] uppercase tracking-wide">
                  DECLINED
                </span>
              </li>
            ))}
            {attendees && attendees.groups.declined.length === 0 && (
              <p className="text-xs text-zinc-500">No declined requests.</p>
            )}
          </ul>
        </div>
      )}

      {/* Placeholder email invite UI retained for future wiring */}
      {isHost && (
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium">Invite by Email (coming soon)</h4>
          <div className="flex gap-2">
            <Input
              placeholder="name@example.com"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
            <Button
              size="sm"
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
                className="flex items-center justify-between rounded-md border px-3 py-2 text-xs bg-white/50 dark:bg-zinc-900/40"
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
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {showDeclineAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeclineAllConfirm(false)}
          />
          <div className="relative w-[90%] max-w-sm rounded-md border bg-white p-4 shadow-xl dark:bg-zinc-900">
            <h5 className="text-sm font-medium mb-2">
              Decline all pending requests?
            </h5>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
              This will decline all current pending attendee requests. This
              action can be reversed individually later by approving them again.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeclineAllConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={actioning === "__declineAll"}
                onClick={async () => {
                  try {
                    setActioning("__declineAll");
                    const pendingIds =
                      attendees?.groups.pending.map((a) => a.userId) || [];
                    const decisions: BulkAttendeeDecision[] = pendingIds.map(
                      (userId) => ({
                        userId,
                        decision: "DECLINE",
                      })
                    );
                    if (decisions.length) {
                      await bulkDecideAttendees(event.id, decisions);
                      const data = await fetchEventAttendees(event.id);
                      setAttendees(data);
                    }
                    setShowDeclineAllConfirm(false);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Failed to decline all"
                    );
                  } finally {
                    setActioning(null);
                  }
                }}
              >
                Confirm Decline All
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
