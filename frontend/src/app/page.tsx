"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChatInput from "../components/ChatInput";
import DocumentManager from "../components/DocumentManager";
import HelpPage from "../components/HelpPage";
import { NavigationItem, Message } from "../types/types";
import { searchRFP } from "../services/api";
import { Loader2, FileText, ChevronDown } from "lucide-react";

const HERO_TAGLINE = "Complete your next RFP with RFP Intelligence.";

export default function Page() {
  const [activeNav, setActiveNav] = useState<NavigationItem>(
    NavigationItem.Chat,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typedTagline, setTypedTagline] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    setSidebarOpen(mediaQuery.matches);

    const handleViewportChange = (event: MediaQueryListEvent) => {
      setSidebarOpen(event.matches);
    };

    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length !== 0) {
      setTypedTagline(HERO_TAGLINE);
      return;
    }

    setTypedTagline("");
    let charIndex = 0;
    const typeInterval = window.setInterval(() => {
      charIndex += 1;
      setTypedTagline(HERO_TAGLINE.slice(0, charIndex));

      if (charIndex >= HERO_TAGLINE.length) {
        window.clearInterval(typeInterval);
      }
    }, 45);

    return () => window.clearInterval(typeInterval);
  }, [messages.length]);

  const handleSend = async (content: string) => {
    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await searchRFP(content);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.synthesized_response,
          sources: response.sources,
          confidence: response.confidence_level,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm sorry, I encountered an error processing your request. Please check your connection.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const ConfidenceBadge = ({ level }: { level: "high" | "medium" | "low" }) => {
    const styles = {
      high: "bg-green-100 text-green-700",
      medium: "bg-amber-100 text-amber-700",
      low: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[level]}`}
      >
        {level} confidence
      </span>
    );
  };

  const SourcesList = ({ sources }: { sources: Message["sources"] }) => {
    const [expanded, setExpanded] = useState(false);
    if (!sources || sources.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          <FileText size={12} />
          {sources.length} source{sources.length !== 1 ? "s" : ""}
          <ChevronDown
            size={12}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded && (
          <div className="mt-2 space-y-2">
            {sources.map((s, i) => (
              <div key={i} className="text-xs bg-gray-50 rounded-lg p-2">
                <div className="font-medium text-gray-700">
                  {s.filename} — {s.locator}
                </div>
                <div className="text-gray-500 mt-1 line-clamp-2">
                  {s.snippet}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onSelectSearch={(query) => {
          setActiveNav(NavigationItem.Chat);
          handleSend(query);
        }}
        onNewChat={() => {
          setMessages([]);
          setActiveNav(NavigationItem.Chat);
        }}
      />

      <main
        className={`flex-1 flex flex-col min-w-0 relative transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-0"}`}
      >
        <div className="absolute inset-0 opacity-40 pointer-events-none" />

        <Header
          activeNav={activeNav}
          setSidebarOpen={setSidebarOpen}
          sidebarOpen={sidebarOpen}
        />

        {activeNav === NavigationItem.Documents ? (
          <DocumentManager />
        ) : activeNav === NavigationItem.Help ? (
          <HelpPage />
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-6 z-10 scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="max-w-5xl mx-auto pt-10 md:pt-16 pb-12 flex flex-col items-center text-center">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-4">
                    Welcome to RFP Intelligence
                  </h1>
                  <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto mb-8 md:mb-16 leading-relaxed px-2 sm:px-0">
                    {typedTagline}
                    {typedTagline.length < HERO_TAGLINE.length && (
                      <span className="ml-0.5 inline-block animate-pulse" aria-hidden="true">
                        |
                      </span>
                    )}
                  </p>
                  <div className="logo-reveal logo-motion w-full flex justify-center px-4 transition-transform duration-300 hover:scale-105">
                    <Image
                      src="/Profero Logo.png"
                      alt="Profero logo"
                      width={220}
                      height={220}
                      sizes="(max-width: 640px) 40vw, (max-width: 768px) 32vw, 220px"
                      className="h-auto w-28 sm:w-36 md:w-52"
                      priority
                    />
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto py-12 space-y-8">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-5 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                            : "bg-white border border-gray-100 text-gray-800 shadow-sm"
                        }`}
                      >
                        <div className="[&>p]:mb-3 [&>ul]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1 [&>strong]:font-semibold">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.role === "assistant" && msg.confidence && (
                          <div className="mt-2">
                            <ConfidenceBadge level={msg.confidence} />
                          </div>
                        )}
                        {msg.role === "assistant" && (
                          <SourcesList sources={msg.sources} />
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex items-center gap-3">
                        <Loader2
                          className="animate-spin text-green-600"
                          size={18}
                        />
                        <span className="text-sm text-gray-500 font-medium">
                          RFP Intelligence is thinking...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Persistent Input Section */}
            <div className="z-20 bg-gradient-to-t from-white via-white to-transparent pt-8">
              <ChatInput onSend={handleSend} disabled={isLoading} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
