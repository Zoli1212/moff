"use client";

import { useState, useEffect } from "react";
import { Menu, MessageCircle } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { AssistantChatModal } from "./AssistantChatModal";
import { getAssistantContext } from "@/actions/assistant-context-actions";

export function AppHeader() {
  const { toggleSidebar } = useSidebar();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [context, setContext] = useState("");
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  const loadContext = async () => {
    setIsLoadingContext(true);
    try {
      const result = await getAssistantContext();
      if (result.success) {
        setContext(result.context);
      }
    } catch (error) {
      console.error("Failed to load context:", error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleOpenChat = async () => {
    if (!context) {
      await loadContext();
    }
    setIsChatOpen(true);
  };
  
  return (
    <>
      <div className="w-full fixed top-0 left-0 right-0 z-40 px-4 py-3">
        <div className="relative w-full">
          <input
            type="text"
            className="w-full pl-4 pr-20 py-2 rounded-lg bg-white/70 border-0 focus:ring-2 focus:ring-orange-500 focus:outline-none text-base placeholder-gray-500 cursor-pointer"
            placeholder="Mit parancsolsz?"
            onClick={handleOpenChat}
            readOnly
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={handleOpenChat}
              className="text-[#FF9900] hover:text-[#FF9900] p-1"
              disabled={isLoadingContext}
            >
              <MessageCircle className="h-6 w-6" />
            </button>
            <button 
              onClick={toggleSidebar}
              className="text-[#FF9900] hover:text-[#FF9900] p-1"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <AssistantChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        context={context}
      />
    </>
  );
}
