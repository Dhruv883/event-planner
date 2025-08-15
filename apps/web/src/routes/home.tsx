import { authClient } from "@/lib/auth-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  console.log(session);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          console.log("lol");
        },
      },
    });
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

      {!session && (
        <div className="space-x-5 p-4">
          <a href="/signup" className="bg-blue-500">
            Signup
          </a>
          <a href="/login" className="bg-blue-500">
            Signin
          </a>
        </div>
      )}
    </div>
  );
}
