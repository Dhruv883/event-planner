import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  fetchCoHostInvites,
  acceptCoHostInvite,
  declineCoHostInvite,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface InviteItem {
  id: string;
  invitedEmail: string;
  invitedUserId?: string | null;
  status: string;
  createdAt: string;
  respondedAt?: string | null;
  event: {
    id: string;
    title: string;
    coverImage: string | null;
    startDate: string;
  };
  inviter: { id: string; name: string | null; email: string | null };
}

export const Route = createFileRoute("/invites")({
  component: InvitesPage,
});

function InvitesPage() {
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  console.log(invites);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchCoHostInvites();
      setInvites(data);
    } catch (e: any) {
      setError(e.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onAccept(invite: InviteItem) {
    try {
      setActioning(invite.id);
      await acceptCoHostInvite(invite.event.id, invite.id);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActioning(null);
    }
  }

  async function onDecline(invite: InviteItem) {
    try {
      setActioning(invite.id);
      await declineCoHostInvite(invite.event.id, invite.id);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActioning(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Co-host Invites</h1>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && invites.length === 0 && (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}
      <div className="space-y-4">
        {invites.map((inv) => {
          const pending = inv.status === "PENDING";
          return (
            <Card key={inv.id} className="p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{inv.event.title}</span>
                  <span className="text-xs rounded-full border px-2 py-0.5 capitalize">
                    {inv.status.toLowerCase()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Invited by{" "}
                  {inv.inviter.name || inv.inviter.email || "Someone"} on{" "}
                  {new Date(inv.createdAt).toLocaleDateString()}
                </span>
              </div>
              {pending && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={actioning === inv.id}
                    onClick={() => onAccept(inv)}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actioning === inv.id}
                    onClick={() => onDecline(inv)}
                  >
                    Decline
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
        {!loading && invites.length === 0 && (
          <p className="text-sm text-muted-foreground">No invites right now.</p>
        )}
      </div>
    </div>
  );
}
