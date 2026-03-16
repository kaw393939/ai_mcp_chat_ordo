import { HomepageChatStage } from "@/components/home/HomepageChatStage";
import { ChatContainer } from "@/frameworks/ui/ChatContainer";

export default function Home() {
  return (
    <HomepageChatStage>
        <ChatContainer isFloating={false} />
    </HomepageChatStage>
  );
}
