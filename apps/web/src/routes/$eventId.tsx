import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/$eventId")({
  component: RouteComponent,
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: "/login" });
    }
  },
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
