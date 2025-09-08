import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import "../index.css";
import Loader from "@/components/loader";
import Navbar from "@/components/navbar";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Connect",
      },
      {
        name: "Connect - Modern Event Planning Platform",
        content:
          "Plan, manage, and execute unforgettable events with our platform",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });

  return (
    <>
      <HeadContent />
      <ThemeProvider attribute="class" defaultTheme="light">
        <div className="grid grid-rows-[auto_1fr] h-svh">
          <Navbar />
          {isFetching ? <Loader /> : <Outlet />}
        </div>
        <Toaster richColors />
      </ThemeProvider>
      {/* <TanStackRouterDevtools position="bottom-left" /> */}
    </>
  );
}
