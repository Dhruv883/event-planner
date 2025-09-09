import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/events")({
  component: RouteComponent,
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: "/login" });
    }
  },
});

function RouteComponent() {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/login" });
  };

  if (isPending) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      {session && (
        <button className="bg-red-500" onClick={handleSignOut}>
          Logout
        </button>
      )}
    </div>
  );
}
