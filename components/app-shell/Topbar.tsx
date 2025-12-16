"use client";

import { signOut } from "next-auth/react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { NavItem } from "./nav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Topbar({
  nav,
  headerTitle,
  userLabel,
}: {
  nav: NavItem[];
  headerTitle: string;
  userLabel: string;
}) {
  const pathname = usePathname();

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {/* Mobile sidebar */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <div className="h-14 flex items-center px-4 border-b">
              <span className="font-semibold">{headerTitle}</span>
            </div>
            <nav className="p-2 space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                      active && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <span className="font-semibold md:hidden">{headerTitle}</span>
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback>{userLabel.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{userLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/settings/password">Change password</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-destructive"
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
