"use client";

import React from "react";
import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import type { User as SessionUser } from "@/core/entities/user";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const isHomeRoute = pathname === "/";
  const shellClasses =
    "flex min-h-(--viewport-block-size) flex-col overflow-x-hidden bg-background text-foreground transition-colors duration-300";
  const mainClasses = isHomeRoute
    ? "relative flex min-h-0 flex-1 flex-col overflow-hidden"
    : "relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain";

  return (
    <div className={shellClasses} data-shell-scroll-owner="document">
      <div
        className="relative flex h-(--viewport-block-size) min-h-(--viewport-block-size) flex-none flex-col"
        data-shell-viewport-stage="true"
      >
        <div className="flex-none">
          <SiteNav user={user} />
        </div>
        <main
          className={mainClasses}
          data-home-chat-route={isHomeRoute ? "true" : undefined}
        >
          {children}
        </main>
      </div>

      <div className="flex-none">
        <SiteFooter />
      </div>
    </div>
  );
}
