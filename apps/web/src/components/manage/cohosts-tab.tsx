import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCoHostInvite,
  fetchCoHostOverview,
  removeCoHost,
  revokeCoHostInvite,
} from "@/lib/api/cohosts";
import type { CoHostOverview } from "@/lib/types";

interface Props {
  eventId: string;
  isHost?: boolean;
}

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

export function CohostsSection({ eventId, isHost }: Props) {
  const [overview, setOverview] = useState<CoHostOverview | null>(null);
  const [val, setVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchCoHostOverview(eventId);
      setOverview(data);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [eventId]);

  async function addEmail() {
    if (!val) return;
    try {
      setLoading(true);
      await createCoHostInvite(eventId, val);
      setVal("");
      await load();
    } catch (e: any) {
      setError(e.message || "Error adding");
    } finally {
      setLoading(false);
    }
  }

  async function onRemove(userId: string) {
    try {
      setLoading(true);
      await removeCoHost(eventId, userId);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onRevoke(inviteId: string) {
    try {
      setLoading(true);
      await revokeCoHostInvite(eventId, inviteId);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Card className="p-4">
      <h3 className="font-medium">Co-hosts</h3>
      <p className="text-sm text-zinc-500 mb-4">
        Grant manage access to trusted friends. (Wiring coming soon)
      </p>
      {isHost && (
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="name@example.com"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
          <Button disabled={!isValidEmail(val) || loading} onClick={addEmail}>
            Invite
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
      {loading && !overview && (
        <p className="text-sm text-zinc-500">Loading...</p>
      )}
      {overview && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-sm mb-2">Current Co-hosts</h4>
            {overview.coHosts.length === 0 && (
              <p className="text-xs text-zinc-500">None yet</p>
            )}
            <ul className="space-y-2">
              {overview.coHosts.map((cohost) => (
                <li
                  key={cohost.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-white/50 dark:bg-zinc-900/40"
                >
                  <span>{cohost.name || cohost.email || cohost.id}</span>
                  {isHost && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemove(cohost.id)}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Invites</h4>
            {overview.invites.length === 0 && (
              <p className="text-xs text-zinc-500">No pending invites</p>
            )}
            <ul className="space-y-2">
              {overview.invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 rounded-md border px-3 py-2 text-sm bg-white/50 dark:bg-zinc-900/40"
                >
                  <div className="flex flex-col">
                    <span>{invite.invitedEmail}</span>
                    <span className="text-xs text-zinc-500">
                      {invite.status.toLowerCase()}
                    </span>
                  </div>
                  {isHost && invite.status === "PENDING" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRevoke(invite.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
