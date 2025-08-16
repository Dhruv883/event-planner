import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/manage/$eventId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Manage event page. Only for host and co-host.</div>;
}
