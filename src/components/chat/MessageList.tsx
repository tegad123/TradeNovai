"use client";

import React, { useEffect, useRef } from "react";
import { Message } from "ai";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ExecutedAction {
  type: string;
  success: boolean;
  data?: unknown;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  executedActions?: ExecutedAction[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-md bg-zinc-700/50 hover:bg-zinc-600/50 text-zinc-400 hover:text-zinc-200 transition-all"
      title="Copy message"
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-[hsl(var(--theme-primary))] animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 rounded-full bg-[hsl(var(--theme-primary))] animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 rounded-full bg-[hsl(var(--theme-primary))] animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-sm text-zinc-400 ml-2">Analyzing...</span>
    </div>
  );
}

export function MessageList({ messages, isLoading, executedActions = [] }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--theme-primary))]/20 to-orange-500/20 flex items-center justify-center mb-4 border border-[hsl(var(--theme-primary))]/20">
          <svg className="w-8 h-8 text-[hsl(var(--theme-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-200 mb-2">Trade Analyzer Ready</h2>
        <p className="text-zinc-400 max-w-sm">
          I can help you log trades, analyze patterns, and improve your trading process.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`group relative flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`relative max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl ${
              message.role === "user"
                ? "bg-gradient-to-br from-[hsl(var(--theme-primary))] to-orange-600 text-white rounded-tr-sm"
                : "bg-zinc-800/80 text-zinc-100 rounded-tl-sm border border-zinc-700/50"
            }`}
          >
            <CopyButton text={message.content} />
            {message.role === "assistant" ? (
              <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700/50 prose-code:text-[hsl(var(--theme-primary))] prose-headings:text-zinc-100 prose-p:text-zinc-200 prose-li:text-zinc-200 prose-strong:text-zinc-100">
                <ReactMarkdown
                  components={{
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const inline = !match;
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: "0.5rem",
                            fontSize: "0.8rem",
                          }}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        </div>
      ))}
      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <div className="flex justify-start">
          <div className="bg-zinc-800/80 rounded-2xl rounded-tl-sm border border-zinc-700/50">
            <TypingIndicator />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

