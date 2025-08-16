import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$eventId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { eventId } = Route.useParams();

  return (
    <div>
      <h1>Event Details for {eventId}</h1>
      <p>
        Event details page. Q - Also invite page? Q - Visible only to invited
        peeps?
      </p>
    </div>
  );
}
