"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "./AccountMenu";
import type { User as SessionUser } from "@/core/entities/user";

interface SiteNavProps {
  user: SessionUser;
}

export function SiteNav({ user }: SiteNavProps) {
  usePathname();

  return (
    <nav
      className="glass-surface safe-area-pt sticky top-0 z-50 border-b border-color-theme shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-colors duration-500"
      aria-label="Primary"
    >
      <div className="site-container flex min-h-14 items-center justify-between gap-4 py-2">
        <div className="flex min-w-0 items-center">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-base tracking-tighter shrink-0"
          >
            <div className="w-6 h-6 accent-fill rounded-sm flex items-center justify-center text-[10px]">
              O
            </div>
            <span>Studio Ordo</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AccountMenu user={user} />
        </div>
      </div>
    </nav>
  );
}
