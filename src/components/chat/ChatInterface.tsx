"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useChat, Message } from "ai/react";
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext";
import { ModelSelector } from "./ModelSelector";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import {
  saveConversation,
  loadConversations,
  deleteConversation,
  Conversation,
} from "@/lib/firebase/chatUtils";

interface ChatInterfaceProps {
  conversationId?: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { user, loading: authLoading, signInWithGoogle } = useSupabaseAuthContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    conversationId || null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: {
      model: "openai",
    },
    onError: (err) => {
      setError(err.message || "An error occurred. Please try again.");
    },
    onFinish: async (message) => {
      if (user && messages.length > 0) {
        const allMessages = [...messages, message];
        await saveConversationToFirebase(allMessages);
      }
    },
  });

  // Load conversations when user logs in
  useEffect(() => {
    if (user) {
      loadUserConversations();
    } else {
      setConversations([]);
      setActiveConversationId(null);
    }
  }, [user]);

  const loadUserConversations = async () => {
    if (!user) return;
    try {
      const convos = await loadConversations(user.id);
      setConversations(convos);
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  };

  const saveConversationToFirebase = async (msgs: Message[]) => {
    if (!user || msgs.length === 0) return;

    const title = msgs[0]?.content.slice(0, 50) || "New conversation";

    try {
      const id = await saveConversation(user.id, {
        id: activeConversationId || undefined,
        title,
        messages: msgs,
        model: "openai",
      });

      if (!activeConversationId) {
        setActiveConversationId(id);
      }

      await loadUserConversations();
    } catch (err) {
      console.error("Error saving conversation:", err);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
  };

  const handleLoadConversation = (conversation: Conversation) => {
    setMessages(conversation.messages);
    setActiveConversationId(conversation.id);
    setIsSidebarOpen(false);
    setError(null);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      await deleteConversation(user.id, convId);
      if (activeConversationId === convId) {
        handleNewChat();
      }
      await loadUserConversations();
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      setError(null);
      handleSubmit(e);
    },
    [handleSubmit]
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-800 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No conversations yet</p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleLoadConversation(conv)}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      activeConversationId === conv.id
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <span className="flex-1 truncate text-sm">{conv.title}</span>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {user && (
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || "User"}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-zinc-100">AI Coach</h1>
          </div>
          <ModelSelector disabled={isLoading} />
        </header>

        {/* Messages or Auth Prompt */}
        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6 border border-emerald-500/20">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-200 mb-2">Sign in to chat</h2>
            <p className="text-zinc-400 max-w-sm mb-6">
              Sign in with your Google account to start chatting and save your conversations.
            </p>
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white text-zinc-900 font-medium hover:bg-zinc-100 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            <MessageList messages={messages} isLoading={isLoading} />

            {/* Error Display */}
            {error && (
              <div className="px-4 py-2">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto p-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
              <ChatInput
                input={input}
                onInputChange={(value) => handleInputChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)}
                onSubmit={handleFormSubmit}
                onStop={stop}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

