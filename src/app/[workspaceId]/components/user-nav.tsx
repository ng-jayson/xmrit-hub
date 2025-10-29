"use client";

import { LogOut } from "lucide-react";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserNavProps {
  session: Session | null;
}

export function UserNav({ session }: UserNavProps) {
  if (!session) {
    return (
      <Button variant="ghost" asChild>
        <a href="/api/auth/signin">Sign in</a>
      </Button>
    );
  }

  const user = session.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
            <AvatarFallback>
              {user?.name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase() ||
                user?.email?.[0]?.toUpperCase() ||
                "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end" forceMount>
        <DropdownMenuLabel className="font-normal px-3 py-3">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none">
              {user?.name || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* <DropdownMenuItem className="px-3 py-2">
          <User className="mr-3 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="px-3 py-2">
          <Settings className="mr-3 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator /> */}
        <DropdownMenuItem
          className="cursor-pointer px-3 py-2"
          onSelect={(event) => {
            event.preventDefault();
            signOut();
          }}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
