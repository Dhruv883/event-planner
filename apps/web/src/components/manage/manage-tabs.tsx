import { useState } from "react";
import {
  BoxIcon,
  HouseIcon,
  PanelsTopLeftIcon,
  Users2,
  CalendarRange,
  ListChecks,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewSection } from "./overview-tab";
import { ScheduleSection } from "./schedule/schedule-section";
import { PollsSection } from "./polls";
import { InvitesSection } from "./invite-tab";
import { CohostsSection } from "./cohosts-tab";
import type { EventData } from "@/lib/types";
import { authClient } from "@/lib/auth-client";

export type ManageTabKey =
  | "overview"
  | "schedule"
  | "polls"
  | "invites"
  | "cohosts";

interface ManageTabsProps {
  event: EventData;
  initialTab?: ManageTabKey;
}

export function ManageTabs({
  event,
  initialTab = "overview",
}: ManageTabsProps) {
  const [tab, setTab] = useState<ManageTabKey>(initialTab);
  const showSchedule = event.type === "WHOLE_DAY" || event.type === "MULTI_DAY";

  const { data: session } = authClient.useSession();
  const isHost = event.hostId === session?.user.id;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as ManageTabKey)}>
      <ScrollArea>
        <TabsList className="mb-3 min-w-max">
          <TabsTrigger value="overview" className="group">
            <HouseIcon
              className="-ms-0.5 me-1.5 opacity-60"
              size={16}
              aria-hidden="true"
            />
            Overview
          </TabsTrigger>
          {showSchedule && (
            <TabsTrigger value="schedule" className="group">
              <CalendarRange
                className="-ms-0.5 me-1.5 opacity-60"
                size={16}
                aria-hidden="true"
              />
              Schedule
            </TabsTrigger>
          )}
          <TabsTrigger value="polls" className="group">
            <PanelsTopLeftIcon
              className="-ms-0.5 me-1.5 opacity-60"
              size={16}
              aria-hidden="true"
            />
            Polls
          </TabsTrigger>
          <TabsTrigger value="invites" className="group">
            <ListChecks
              className="-ms-0.5 me-1.5 opacity-60"
              size={16}
              aria-hidden="true"
            />
            Invites
          </TabsTrigger>
          <TabsTrigger value="cohosts" className="group">
            <Users2
              className="-ms-0.5 me-1.5 opacity-60"
              size={16}
              aria-hidden="true"
            />
            Co-hosts
          </TabsTrigger>
        </TabsList>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <TabsContent
        value="overview"
        className="focus-visible:outline-none focus-visible:ring-0"
      >
        <OverviewSection />
      </TabsContent>
      {showSchedule && (
        <TabsContent
          value="schedule"
          className="focus-visible:outline-none focus-visible:ring-0"
        >
          <ScheduleSection event={event} />
        </TabsContent>
      )}
      <TabsContent
        value="polls"
        className="focus-visible:outline-none focus-visible:ring-0"
      >
        <PollsSection eventId={event.id} />
      </TabsContent>
      <TabsContent
        value="invites"
        className="focus-visible:outline-none focus-visible:ring-0"
      >
        <InvitesSection />
      </TabsContent>
      <TabsContent
        value="cohosts"
        className="focus-visible:outline-none focus-visible:ring-0"
      >
        <CohostsSection eventId={event.id} isHost={isHost} />
      </TabsContent>
    </Tabs>
  );
}

export default ManageTabs;
