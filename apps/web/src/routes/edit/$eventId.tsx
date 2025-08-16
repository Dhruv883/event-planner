import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/edit/$eventId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Edit event page. Only for host and co-host.</div>;
}
