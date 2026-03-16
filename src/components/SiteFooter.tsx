"use client";

import React from "react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-color-theme bg-background py-12 px-[var(--container-padding)]">
      <div className="site-container flex flex-col md:flex-row justify-between items-start gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-base tracking-tighter">
            <div className="w-6 h-6 accent-fill rounded-sm flex items-center justify-center text-[10px]">
              O
            </div>
            <span>Studio Ordo</span>
          </div>
          <p className="text-[11px] font-medium opacity-60 leading-relaxed max-w-xs">
            Architecting high-performance systems for the intelligence era.
            Bridging the gap between Clean Architecture and LLM orchestration.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
          <div className="space-y-4">
            <p className="text-label opacity-70">Platform</p>
            <ul className="space-y-2 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity">
              <li><Link href="/books">Library</Link></li>
              <li><Link href="/training">Training</Link></li>
              <li><Link href="/studio">Studio</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <p className="text-label opacity-70">Resources</p>
            <ul className="space-y-2 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity">
              <li><Link href="/docs">Documentation</Link></li>
              <li><Link href="/patterns">Patterns</Link></li>
              <li><Link href="/api">API</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <p className="text-label opacity-70">Legal</p>
            <ul className="space-y-2 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity">
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="site-container mt-12 pt-8 border-t border-color-theme flex justify-between items-center">
        <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest">
          © 2026 Studio Ordo. All rights reserved.
        </span>
        <div className="flex gap-4">
          <div className="w-1.5 h-1.5 rounded-full bg-status-success/50" />
          <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Global Status: Optimal</span>
        </div>
      </div>
    </footer>
  );
}
