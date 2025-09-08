import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import NotificationMenu from "./notification-menu";
import UserMenu from "./user-menu";

export default function Navbar() {
  const navItems = [
    { name: "Events", to: "/events" },
    { name: "Explore", to: "/explore" },
    { name: "Create Event", to: "/create" },
  ];

  return (
    <header className="w-full py-4 px-6 font-urbanist">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-foreground text-2xl font-semibold">
            Connect
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-1 items-center justify-end gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm font-bold pt-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.to}
                  className="text-[#888888] hover:text-foreground px-2 rounded-full font-medium transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <NotificationMenu />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
