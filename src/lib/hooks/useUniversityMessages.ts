"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabaseAuthContext } from '@/lib/contexts/SupabaseAuthContext'
import { createClientSafe } from '@/lib/supabase/browser'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  getThreadsByCourse,
  getMessagesByThread,
  createThread as createThreadUtil,
  sendMessage as sendMessageUtil,
  markMessagesRead as markMessagesReadUtil,
  type MessageThread,
  type Message
} from '@/lib/supabase/universityUtils'

export function useUniversityMessages(courseId: string | null) {
  const { user } = useSupabaseAuthContext()
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Store subscription ref for cleanup
  const subscriptionRef = useRef<RealtimeChannel | null>(null)

  // Load threads
  const loadThreads = useCallback(async () => {
    if (!courseId || !user) {
      setThreads([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getThreadsByCourse(courseId, user.id)
      setThreads(data)
    } catch (err) {
      console.error('Error loading threads:', err)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [courseId, user])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  // Load messages when thread selected
  const loadMessages = useCallback(async (threadId: string) => {
    try {
      setMessagesLoading(true)
      const data = await getMessagesByThread(threadId)
      setMessages(data)
      
      // Mark messages as read
      if (user) {
        await markMessagesReadUtil(threadId, user.id)
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setMessagesLoading(false)
    }
  }, [user])

  // Select a thread
  const selectThread = useCallback(async (thread: MessageThread) => {
    setSelectedThread(thread)
    await loadMessages(thread.id)
  }, [loadMessages])

  // Set up realtime subscription for messages
  useEffect(() => {
    if (!selectedThread) return

    const supabase = createClientSafe()
    if (!supabase) return

    // Subscribe to new messages in this thread
    const channel = supabase
      .channel(`messages:${selectedThread.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${selectedThread.id}`
        },
        async (payload) => {
          // Add new message to list
          const newMessage = payload.new as Message
          
          // Only add if not from current user (to avoid duplicates)
          if (newMessage.sender_id !== user?.id) {
            // Fetch full message with sender info
            await loadMessages(selectedThread.id)
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel as unknown as typeof subscriptionRef.current

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedThread, user?.id, loadMessages])

  // Send a message
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!user || !selectedThread) return false

    const message = await sendMessageUtil(selectedThread.id, user.id, content)
    
    if (message) {
      // Add message to local state immediately
      setMessages(prev => [...prev, {
        ...message,
        sender_name: user.user_metadata?.full_name || 'You',
        sender_role: 'student' // Will be updated on next load
      }])
      
      // Refresh threads to update last_message
      await loadThreads()
      
      return true
    }

    setError("Failed to send message")
    return false
  }, [user, selectedThread, loadThreads])

  // Create a new thread
  const createThread = useCallback(async (
    subject: string,
    participantIds: string[]
  ): Promise<MessageThread | null> => {
    if (!user || !courseId) return null

    const thread = await createThreadUtil(courseId, user.id, subject, participantIds)

    if (thread) {
      await loadThreads()
      setSelectedThread(thread)
    }

    return thread
  }, [user, courseId, loadThreads])

  // Get unread count for a thread
  const getUnreadCount = useCallback((threadId: string): number => {
    const thread = threads.find(t => t.id === threadId)
    if (!thread?.last_message) return 0
    if (thread.last_message.sender_id === user?.id) return 0
    if (thread.last_message.is_read) return 0
    return 1 // Simplified - just show 1 if there's an unread message
  }, [threads, user?.id])

  // Total unread count
  const totalUnread = threads.reduce((acc, t) => acc + getUnreadCount(t.id), 0)

  return {
    threads,
    selectedThread,
    messages,
    loading,
    messagesLoading,
    error,
    totalUnread,
    selectThread,
    setSelectedThread,
    sendMessage,
    createThread,
    getUnreadCount,
    refresh: loadThreads
  }
}

