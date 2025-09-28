import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Link as LinkIcon } from "lucide-react";
import { Route } from "../../routes/manage/$eventId";

export function QuickActions({ publicEventUrl }: { publicEventUrl: string }) {
  const { eventId } = Route.useParams();
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-2">Quick actions</h3>
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(publicEventUrl);
            } catch {}
          }}
        >
          <LinkIcon className="h-4 w-4 mr-2" /> Copy public link
        </Button>
        <Link to="/$eventId" params={{ eventId }}>
          <Button variant="outline" className="w-full justify-start">
            <ExternalLink className="h-4 w-4 mr-2" /> View public page
          </Button>
        </Link>
      </div>
    </Card>
  );
}
