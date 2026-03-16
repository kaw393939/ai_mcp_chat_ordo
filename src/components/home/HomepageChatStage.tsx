import React from "react";

interface HomepageChatStageProps {
  children: React.ReactNode;
}

export function HomepageChatStage({ children }: HomepageChatStageProps) {
  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
      data-homepage-chat-stage="true"
      data-homepage-stage-behavior="bounded"
    >
      <div
        className="site-container flex min-h-0 flex-1 flex-col overflow-hidden"
        data-homepage-chat-stage-shell="true"
      >
        {children}
      </div>
    </section>
  );
}