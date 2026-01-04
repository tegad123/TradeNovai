"use client";

import React, { useRef, useEffect } from "react";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isLoading = false,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && !disabled) {
        onSubmit(e);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative">
      <div className="relative flex items-end gap-2 p-2 bg-zinc-800/50 rounded-2xl border border-zinc-700/50 focus-within:border-emerald-500/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ maxHeight: "200px" }}
        />
        <div className="flex items-center gap-2 pr-1">
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              title="Stop generating"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || disabled}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
              title="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-zinc-500 text-center mt-2">
        Press Enter to send, Shift + Enter for new line
      </p>
    </form>
  );
}

