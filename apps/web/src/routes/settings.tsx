import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: "/login" });
    }
  },
});

function RouteComponent() {
  return <div>Hello "/settings"!</div>;
}
