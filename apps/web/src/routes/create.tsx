import Navbar from "@/components/navbar";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/create")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col items-center pt-4">
      <div className="w-10/12 border h-64 text-center">Cover Image</div>
    </div>
  );
}
