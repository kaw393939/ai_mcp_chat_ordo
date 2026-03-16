"use client";

import React, { useState } from "react";
import { useGlobalChat } from "@/hooks/useGlobalChat";

export const ConversationSidebar: React.FC = () => {
  const { archiveConversation, conversationId } = useGlobalChat();
  const [showConfirm, setShowConfirm] = useState(false);

  // Only show "New Chat" when there's an active conversation to archive
  if (!conversationId) return null;

  return (
    <div className="flex flex-col gap-1 px-2 py-2">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-theme text-xs font-bold opacity-70 hover:opacity-100 hover-surface transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 text-xs">
          <span className="opacity-60">Start fresh? Your current conversation will be saved and searchable.</span>
          <button
            onClick={() => { archiveConversation(); setShowConfirm(false); }}
            className="shrink-0 px-2 py-1 rounded-lg accent-fill font-bold"
          >
            Start fresh
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="shrink-0 px-2 py-1 rounded-lg opacity-60 hover:opacity-100"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
