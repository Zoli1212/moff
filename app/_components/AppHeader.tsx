"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, MessageCircle, Bell } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { AssistantChatModal } from "./AssistantChatModal";
import { getAssistantContext } from "@/actions/assistant-context-actions";
import { getUnreadNotificationCount, getNotifications, markNotificationRead, markAllNotificationsRead } from "@/actions/quote-request-actions";
import { useUser } from "@clerk/nextjs";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  sessionId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export function AppHeader() {
  const { toggleSidebar } = useSidebar();
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [context, setContext] = useState("");
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);

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

  const loadNotifications = useCallback(async () => {
    if (!userEmail) return;
    try {
      const [count, items] = await Promise.all([
        getUnreadNotificationCount(userEmail),
        getNotifications(userEmail),
      ]);
      setUnreadCount(count);
      setNotifications(items as Notification[]);
    } catch {
      // silently fail
    }
  }, [userEmail]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id, userEmail);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(userEmail);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
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
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="text-[#FF9900] hover:text-[#FF9900] p-1 relative"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-800">Értesítések</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-orange-500 hover:text-orange-600"
                      >
                        Mind olvasott
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">Nincs értesítés</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleMarkRead(n.id)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-orange-50 transition-colors ${
                            !n.isRead ? "bg-orange-50/50" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!n.isRead && (
                              <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                            )}
                            <div className={!n.isRead ? "" : "ml-4"}>
                              <p className="text-sm font-medium text-gray-800">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                              <p className="text-[10px] text-gray-300 mt-1">
                                {new Date(n.createdAt).toLocaleDateString("hu-HU", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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
