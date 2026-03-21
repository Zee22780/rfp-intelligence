"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  FileText,
  Settings,
  HelpCircle,
  PanelLeftClose,
  Search,
  SquarePen,
} from "lucide-react";
import {
  NavigationItem,
  RecentSearch,
  SearchHistoryItem,
} from "../types/types";
import { getSearchHistory } from "../services/api";

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMinutes < 2) return "Just now";
  const isToday = date.toDateString() === now.toDateString();
  if (isToday)
    return `Today, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SidebarProps {
  activeNav: NavigationItem;
  setActiveNav: (nav: NavigationItem) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSelectSearch: (query: string) => void;
  onNewChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  setActiveNav,
  isOpen,
  setIsOpen,
  onSelectSearch,
  onNewChat,
}) => {
  const navItems = [
    { id: NavigationItem.Chat, icon: MessageSquare },
    { id: NavigationItem.Documents, icon: FileText },
  ];

  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    getSearchHistory(10)
      .then((data) => {
        setRecentSearches(
          data.items.map((item: SearchHistoryItem) => ({
            id: item.id,
            title: item.query_text,
            timestamp: formatTimestamp(item.created_at),
          })),
        );
      })
      .catch(() => setHistoryError(true))
      .finally(() => setHistoryLoading(false));
  }, []);

  const feedbackEmail = "";
  const feedbackSubject = "RFP Intelligence Feedback";
  const feedbackBody =
    "Hi Team,\n\nI'd like to share the following feedback:\n\n";
  const feedbackMailto = `mailto:${feedbackEmail}?subject=${encodeURIComponent(feedbackSubject)}&body=${encodeURIComponent(feedbackBody)}`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-transform duration-300 w-64 ${isOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-gray-900 tracking-tight">
              RFP Intelligence.AI
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded-md"
            >
              <PanelLeftClose size={20} className="text-gray-500" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="hidden lg:block p-1 hover:bg-gray-100 rounded-md"
            >
              <PanelLeftClose
                size={20}
                className="text-gray-400 hover:text-gray-600"
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 flex-1 overflow-y-auto space-y-1 mt-2">
          {navItems.map((item) => (
            <React.Fragment key={item.id}>
              <button
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  activeNav === item.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <item.icon
                  size={20}
                  className={
                    activeNav === item.id ? "text-blue-600" : "text-gray-400"
                  }
                />
                <span className="text-sm">{item.id}</span>
              </button>
              {item.id === NavigationItem.Chat && (
                <button
                  onClick={onNewChat}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-gray-600 hover:bg-gray-50"
                >
                  <SquarePen size={20} className="text-gray-400" />
                  <span className="text-sm">New AI Chat</span>
                </button>
              )}
            </React.Fragment>
          ))}

          {/* Recent Chat Section */}
          {/* <div className="pt-8 pb-4">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Recent Searches
            </h3>
            <div className="space-y-2">
              {historyLoading ? (
                <p className="text-xs text-gray-400 px-3">Loading...</p>
              ) : historyError ? (
                <p className="text-xs text-gray-400 px-3">Could not load history.</p>
              ) : recentSearches.length === 0 ? (
                <p className="text-xs text-gray-400 px-3">No recent searches.</p>
              ) : (
                (showAll ? recentSearches : recentSearches.slice(0, 3)).map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => onSelectSearch(chat.title)}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 bg-white hover:border-blue-200 cursor-pointer transition-colors group"
                  >
                    <div className="flex gap-3">
                      <Search size={16} className="text-gray-400 mt-1 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-700 line-clamp-1">
                          {chat.title}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {chat.timestamp}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            {recentSearches.length > 3 && (
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className="w-full mt-2 text-xs font-medium text-gray-500 py-2 border border-gray-100 rounded-lg hover:bg-gray-50"
              >
                {showAll ? "Show Less" : "Show More"}
              </button>
            )}
          </div> */}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="space-y-1 mb-4">
            <a
              href={feedbackMailto}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <Settings size={18} className="text-gray-400" />
              Feedback
            </a>
            <button
              onClick={() => setActiveNav(NavigationItem.Help)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <HelpCircle size={18} className="text-gray-400" />
              Help
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
