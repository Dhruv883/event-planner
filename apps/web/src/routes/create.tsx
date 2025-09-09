import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/create")({
  component: RouteComponent,
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: "/login" });
    }
  },
});

function RouteComponent() {
  return (
    <div className="flex flex-col items-center pt-4">
      <div className="w-10/12 border h-64 text-center">Cover Image</div>
    </div>
  );
}
