"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  User,
  Users,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUniversity } from "@/lib/contexts/UniversityContext"
import { useUniversityMessages } from "@/lib/hooks/useUniversityMessages"
import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"
import { getCourseStudents, getCourseInstructor } from "@/lib/supabase/universityUtils"
import type { UserProfile } from "@/lib/supabase/universityUtils"

export default function MessagesPage() {
  const params = useParams()
  const classId = params.classId as string
  const { currentCourse, currentUser, currentRole } = useUniversity()
  const [searchQuery, setSearchQuery] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [showNewThreadModal, setShowNewThreadModal] = useState(false)
  const [newThreadSubject, setNewThreadSubject] = useState("")
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [courseMembers, setCourseMembers] = useState<UserProfile[]>([])
  const [sendingMessage, setSendingMessage] = useState(false)
  const [creatingThread, setCreatingThread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    threads,
    selectedThread,
    messages,
    loading,
    messagesLoading,
    selectThread,
    setSelectedThread,
    sendMessage,
    createThread,
    getUnreadCount,
    error: messagesError,
  } = useUniversityMessages(currentCourse?.id || null)

  // Load available recipients for new thread
  // Students can only message the instructor
  // Instructors can message any student
  useEffect(() => {
    async function loadMembers() {
      if (!currentCourse) return
      
      if (currentRole === 'instructor') {
        // Instructors can message any student
        const students = await getCourseStudents(currentCourse.id)
        setCourseMembers(students)
      } else {
        // Students can only message the instructor
        const instructor = await getCourseInstructor(currentCourse.id)
        if (instructor) {
          setCourseMembers([instructor])
        }
      }
    }
    loadMembers()
  }, [currentCourse, currentRole])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filteredThreads = threads.filter(t =>
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.participants?.some(p => p.user_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    
    setSendingMessage(true)

    const success = await sendMessage(newMessage)
    
    if (success) {
      setNewMessage("")
    }
    setSendingMessage(false)
  }

  const handleCreateThread = async () => {
    if (!newThreadSubject.trim() || selectedParticipants.length === 0) return
    
    setCreatingThread(true)
    const thread = await createThread(newThreadSubject, selectedParticipants)

    if (thread) {
      setShowNewThreadModal(false)
      setNewThreadSubject("")
      setSelectedParticipants([])
    } else {
      alert(
        'Failed to create message thread. This is usually caused by Supabase RLS policy recursion on thread_participants.\n\n' +
          'Fix: run `supabase/migrations/007_fix_messaging_rls_recursion.sql` in Supabase SQL editor.'
      )
    }
    setCreatingThread(false)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  if (!currentCourse) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {messagesError && (
          <GlassCard className="p-4 border border-red-500/20 bg-red-500/10">
            <p className="text-sm text-red-300 whitespace-pre-wrap">{messagesError}</p>
          </GlassCard>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            <p className="text-[var(--text-muted)]">
              {currentRole === 'instructor' 
                ? 'Communicate with your students' 
                : 'Message your instructor directly'}
            </p>
          </div>
          <Button variant="glass-theme" onClick={() => setShowNewThreadModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {currentRole === 'instructor' ? 'New Message' : 'Message Instructor'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
          {/* Thread List */}
          <div className="lg:col-span-1 flex flex-col">
            <GlassCard className="flex-1 flex flex-col overflow-hidden">
              {/* Search */}
              <div className="p-4 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                  />
                </div>
              </div>

              {/* Threads */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 text-[var(--text-muted)] mx-auto animate-spin" />
                  </div>
                ) : filteredThreads.length > 0 ? (
                  filteredThreads.map((thread) => {
                    const unreadCount = getUnreadCount(thread.id)
                    
                    return (
                      <button
                        key={thread.id}
                        onClick={() => selectThread(thread)}
                        className={cn(
                          "w-full p-4 flex items-start gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5",
                          selectedThread?.id === thread.id && "bg-white/10"
                        )}
                      >
                        <div className="w-10 h-10 rounded-full bg-theme-gradient flex items-center justify-center flex-shrink-0">
                          {(thread.participants?.length || 0) > 2 ? (
                            <Users className="w-5 h-5 text-white" />
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-medium text-white truncate">{thread.subject}</h3>
                            <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                              {formatTime(thread.updated_at)}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-muted)] truncate mt-1">
                            {thread.participants?.filter(p => p.user_id !== currentUser?.id).map(p => p.user_name).join(', ') || 'No participants'}
                          </p>
                          {unreadCount > 0 && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[hsl(var(--theme-primary))] text-xs text-white">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-2" />
                    <p className="text-[var(--text-muted)]">No messages found</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-2">
            <GlassCard className="h-full flex flex-col">
              {selectedThread ? (
                <>
                  {/* Thread header */}
                  <div className="p-4 border-b border-white/10">
                    <h2 className="font-semibold text-white">{selectedThread.subject}</h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      {selectedThread.participants?.map(p => p.user_name).join(', ')}
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
                      </div>
                    ) : messages.length > 0 ? (
                      messages.map((message) => {
                        const isOwn = message.sender_id === currentUser?.id
                        
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex gap-3",
                              isOwn && "flex-row-reverse"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                              message.sender_role === 'instructor' ? "bg-theme-gradient" : "bg-white/20"
                            )}>
                              <span className="text-xs font-medium text-white">
                                {(message.sender_name || 'U').charAt(0)}
                              </span>
                            </div>
                            <div className={cn(
                              "max-w-[70%] rounded-2xl px-4 py-2",
                              isOwn ? "bg-theme-gradient" : "bg-white/10"
                            )}>
                              {!isOwn && (
                                <p className="text-xs text-[var(--text-muted)] mb-1">
                                  {message.sender_name}
                                </p>
                              )}
                              <p className="text-sm text-white">{message.content}</p>
                              <p className="text-xs text-white/60 mt-1">
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                        No messages yet. Start the conversation!
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message input */}
                  <div className="p-4 border-t border-white/10">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                      />
                      <Button
                        variant="glass-theme"
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <MessageSquare className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Select a Conversation</h3>
                    <p className="text-[var(--text-muted)]">
                      Choose a message thread from the left or start a new one
                    </p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        {/* New Thread Modal */}
        {showNewThreadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <GlassCard className="w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">New Message</h2>
                <button 
                  onClick={() => setShowNewThreadModal(false)}
                  className="text-[var(--text-muted)] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-[var(--text-muted)]">Subject</label>
                  <input
                    type="text"
                    placeholder="Message subject..."
                    value={newThreadSubject}
                    onChange={(e) => setNewThreadSubject(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-[var(--text-muted)]">
                    {currentRole === 'instructor' ? 'Select Recipients' : 'Recipient'}
                  </label>
                  {currentRole === 'student' && (
                    <p className="text-xs text-[var(--text-muted)] -mt-1">
                      Students can only message the instructor
                    </p>
                  )}
                  <div className="max-h-48 overflow-y-auto rounded-xl bg-white/5 border border-white/10">
                    {courseMembers.length > 0 ? courseMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => toggleParticipant(member.id)}
                        className={cn(
                          "w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left",
                          selectedParticipants.includes(member.id) && "bg-white/10"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {(member.full_name || 'U').charAt(0)}
                          </span>
                        </div>
                        <span className="text-white">{member.full_name || 'User'}</span>
                        {selectedParticipants.includes(member.id) && (
                          <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />
                        )}
                      </button>
                    )) : (
                      <div className="p-4 text-center text-[var(--text-muted)]">
                        No members found
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowNewThreadModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="glass-theme" 
                  onClick={handleCreateThread}
                  disabled={!newThreadSubject.trim() || selectedParticipants.length === 0 || creatingThread}
                >
                  {creatingThread ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Create Thread
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </PageContainer>
  )
}

