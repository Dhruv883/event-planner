import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/explore")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Public Events!! Coming SOON</div>;
}
