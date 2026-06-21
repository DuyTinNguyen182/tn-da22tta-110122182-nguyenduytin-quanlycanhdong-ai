import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const AnnouncementContext = createContext(null);
const UNREAD_POLL_INTERVAL_MS = 30000;

export const AnnouncementProvider = ({ children }) => {
  const { user, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const isFarmer = (user?.role || "").toLowerCase() === "farmer";

  const refreshUnreadSummary = useCallback(async () => {
    if (loading || !user || !isFarmer) {
      setUnreadCount(0);
      return { unreadCount: 0 };
    }

    try {
      const res = await api.get("/announcements/unread-summary");
      const nextUnreadCount = Number(res.data?.unreadCount || 0);
      setUnreadCount(nextUnreadCount);
      return { unreadCount: nextUnreadCount };
    } catch (error) {
      setUnreadCount(0);
      return { unreadCount: 0 };
    }
  }, [isFarmer, loading, user]);

  const markAllAnnouncementsRead = useCallback(async () => {
    if (loading || !user || !isFarmer) {
      setUnreadCount(0);
      return { markedCount: 0, unreadCount: 0 };
    }

    try {
      const res = await api.post("/announcements/mark-read");
      setUnreadCount(Number(res.data?.unreadCount || 0));
      return res.data || { markedCount: 0, unreadCount: 0 };
    } catch (error) {
      return { markedCount: 0, unreadCount: 0 };
    }
  }, [isFarmer, loading, user]);

  useEffect(() => {
    refreshUnreadSummary();
  }, [refreshUnreadSummary]);

  useEffect(() => {
    if (loading || !user || !isFarmer) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshUnreadSummary();
    }, UNREAD_POLL_INTERVAL_MS);

    const handleWindowFocus = () => {
      refreshUnreadSummary();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshUnreadSummary();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isFarmer, loading, refreshUnreadSummary, user]);

  const contextValue = useMemo(
    () => ({
      unreadCount,
      hasUnread: unreadCount > 0,
      refreshUnreadSummary,
      markAllAnnouncementsRead,
    }),
    [markAllAnnouncementsRead, refreshUnreadSummary, unreadCount]
  );

  return (
    <AnnouncementContext.Provider value={contextValue}>
      {children}
    </AnnouncementContext.Provider>
  );
};

export const useAnnouncements = () => {
  const value = useContext(AnnouncementContext);

  if (!value) {
    throw new Error("useAnnouncements must be used inside AnnouncementProvider");
  }

  return value;
};
