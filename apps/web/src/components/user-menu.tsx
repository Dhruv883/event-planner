import {
  BoltIcon,
  BookOpenIcon,
  Layers2Icon,
  LogInIcon,
  LogOutIcon,
  PinIcon,
  UserPenIcon,
  UserPlusIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link to="/login">
            <LogInIcon size={16} className="mr-2" />
            Login
          </Link>
        </Button>
        <Button asChild>
          <Link to="/signup">
            <UserPlusIcon size={16} className="mr-2" />
            Sign Up
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-0 hover:bg-transparent cursor-pointer"
        >
          <Avatar>
            <AvatarImage
              src={"https://github.com/shadcn.png"}
              alt="Profile Image"
            />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 mt-2" align="end">
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="text-foreground truncate text-sm font-medium">
            {session.user.name}
          </span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {session.user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BoltIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Layers2Icon size={16} className="opacity-60" aria-hidden="true" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            authClient.signOut();
            navigate({ to: "/login" });
          }}
        >
          <LogOutIcon size={16} className="opacity-60" aria-hidden="true" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
