import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, UserPlus } from "lucide-react";

export function OverviewSection() {
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
