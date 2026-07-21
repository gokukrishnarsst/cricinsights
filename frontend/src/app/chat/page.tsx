import { Suspense } from "react";
import ChatPage from "./ChatClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-mute">Loading chat...</div>}>
      <ChatPage />
    </Suspense>
  );
}
