import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { EvidenceSummary } from '@/lib/types/engagement'

// Helper to create Supabase client
function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignore
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Ignore
          }
        },
      },
    }
  )
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // #region agent log
    console.log('[DEBUG:AUTH_CHECK]', JSON.stringify({hasUser:!!user,userId:user?.id,userEmail:user?.email,authError:authError?.message}));
    // #endregion
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { studentId, courseId, disputeReason, disputeAmount } = body

    if (!studentId || !courseId) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, courseId' },
        { status: 400 }
      )
    }

    // Verify instructor owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name, code, instructor_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course || course.instructor_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this course' },
        { status: 403 }
      )
    }

    // Get student profile
    const { data: studentProfile } = await supabase
      .from('user_profiles')
      .select('full_name, avatar_url')
      .eq('id', studentId)
      .single()

    const studentName = studentProfile?.full_name || 'Student'

    // Get enrollment data
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('enrolled_at, role')
      .eq('user_id', studentId)
      .eq('course_id', courseId)
      .single()

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this course' },
        { status: 404 }
      )
    }

    // Get lesson progress
    const { data: modules } = await supabase
      .from('modules')
      .select(`
        id,
        title,
        lessons (
          id,
          title
        )
      `)
      .eq('course_id', courseId)

    const allLessonIds = modules?.flatMap(m => 
      (m.lessons as { id: string }[]).map(l => l.id)
    ) || []
    const totalLessons = allLessonIds.length

    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at')
      .eq('user_id', studentId)
      .eq('is_completed', true)
      .in('lesson_id', allLessonIds.length > 0 ? allLessonIds : ['none'])

    const completedLessons = lessonProgress?.length || 0

    // Get assignment submissions
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title')
      .eq('course_id', courseId)

    const assignmentIds = assignments?.map(a => a.id) || []

    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, assignment_id, submitted_at, grade, status')
      .eq('student_id', studentId)
      .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none'])

    const totalAssignments = submissions?.filter(s => 
      s.status === 'submitted' || s.status === 'graded'
    ).length || 0

    // Get trade logs
    const { data: tradeLogs } = await supabase
      .from('university_trade_logs')
      .select('id, trade_date, symbol, side, pnl, reflection, submitted_at')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .order('submitted_at', { ascending: false })

    const totalTradeLogs = tradeLogs?.length || 0

    // Get messages
    const { data: messageThreads } = await supabase
      .from('message_threads')
      .select('id')
      .eq('course_id', courseId)

    const threadIds = messageThreads?.map(t => t.id) || []

    const { data: messages } = await supabase
      .from('messages')
      .select('id, created_at')
      .eq('sender_id', studentId)
      .in('thread_id', threadIds.length > 0 ? threadIds : ['none'])

    const totalMessages = messages?.length || 0

    // Get engagement metrics
    const { data: engagementMetrics } = await supabase
      .from('student_engagement_metrics')
      .select('daily_engagement_score, weekly_engagement_score, metric_date, days_inactive')
      .eq('user_id', studentId)
      .eq('course_id', courseId)
      .order('metric_date', { ascending: false })
      .limit(30)

    const avgEngagement = engagementMetrics && engagementMetrics.length > 0
      ? engagementMetrics.reduce((acc, m) => acc + m.daily_engagement_score, 0) / engagementMetrics.length
      : 0

    const daysSinceLastActive = engagementMetrics?.[0]?.days_inactive || 0

    // Get activity audit logs
    const { data: auditLogs } = await supabase
      .from('activity_audit_log')
      .select('activity_type, activity_description, created_at, ip_address')
      .eq('user_id', studentId)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(100)

    const totalLogins = auditLogs?.filter(l => l.activity_type === 'login').length || 0

    // Get terms acceptance
    const { data: termsAcceptance } = await supabase
      .from('terms_acceptance_log')
      .select('accepted_at, ip_address, terms_version')
      .eq('user_id', studentId)
      .eq('course_id', courseId)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .single()

    // Calculate last active date
    const activityDates = [
      ...(lessonProgress?.map(l => l.completed_at) || []),
      ...(submissions?.map(s => s.submitted_at) || []),
      ...(tradeLogs?.map(t => t.submitted_at) || []),
      ...(messages?.map(m => m.created_at) || [])
    ].filter(Boolean).map(d => new Date(d))

    const lastActive = activityDates.length > 0
      ? new Date(Math.max(...activityDates.map(d => d.getTime()))).toISOString()
      : enrollment.enrolled_at

    // Estimate time spent (rough calculation based on activity)
    const totalMinutesSpent = (completedLessons * 15) + (totalAssignments * 30) + (totalTradeLogs * 10)

    // ============================================
    // GENERATE PDF
    // ============================================
    const doc = new jsPDF()
    let yPos = 20

    const checkPageBreak = (neededHeight: number) => {
      if (yPos + neededHeight > 280) {
        doc.addPage()
        yPos = 20
      }
    }

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('CHARGEBACK DISPUTE EVIDENCE', 105, yPos, { align: 'center' })
    yPos += 10

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Student Activity & Engagement Report', 105, yPos, { align: 'center' })
    yPos += 15

    // Document Info Box
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(15, yPos, 180, 40, 3, 3, 'FD')

    doc.setFontSize(10)
    doc.text(`Document ID: ${Date.now()}`, 20, yPos + 8)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos + 16)
    doc.text(`Course: ${course.name} (${course.code})`, 20, yPos + 24)
    doc.text(`Student: ${studentName}`, 20, yPos + 32)

    yPos += 50

    // Enrollment Evidence Section
    checkPageBreak(60)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('1. ENROLLMENT EVIDENCE', 20, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Enrollment Date: ${new Date(enrollment.enrolled_at).toLocaleDateString()}`, 25, yPos)
    yPos += 6
    doc.text(`Enrollment Role: ${enrollment.role}`, 25, yPos)
    yPos += 6

    if (termsAcceptance) {
      doc.text(`Terms Accepted: ${new Date(termsAcceptance.accepted_at).toLocaleString()}`, 25, yPos)
      yPos += 6
      doc.text(`Terms Version: ${termsAcceptance.terms_version}`, 25, yPos)
      yPos += 6
      if (termsAcceptance.ip_address) {
        doc.text(`IP Address at Acceptance: ${termsAcceptance.ip_address}`, 25, yPos)
        yPos += 6
      }
    }

    yPos += 10

    // Progress Summary Section
    checkPageBreak(80)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('2. COURSE PROGRESS SUMMARY', 20, yPos)
    yPos += 10

    const completionPercentage = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value', 'Details']],
      body: [
        ['Lessons Completed', `${completedLessons}/${totalLessons}`, `${completionPercentage}% completion rate`],
        ['Assignments Submitted', String(totalAssignments), 'Assignments with feedback received'],
        ['Trade Logs Submitted', String(totalTradeLogs), 'Trading reflections with analysis'],
        ['Messages Sent', String(totalMessages), 'Course communication activity'],
        ['Avg Engagement Score', `${avgEngagement.toFixed(0)}/100`, 'Based on daily activity metrics'],
        ['Days Since Last Active', String(daysSinceLastActive), lastActive ? `Last: ${new Date(lastActive).toLocaleDateString()}` : 'N/A'],
        ['Estimated Time Spent', `${Math.floor(totalMinutesSpent / 60)}h ${totalMinutesSpent % 60}m`, 'Based on activity completion'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
    })

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

    // Lesson Completion Timeline
    if (lessonProgress && lessonProgress.length > 0) {
      checkPageBreak(100)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('3. LESSON COMPLETION TIMELINE', 20, yPos)
      yPos += 10

      const lessonData = lessonProgress
        .filter(lp => lp.completed_at)
        .sort((a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime())
        .slice(0, 20)
        .map((lp, index) => [
          String(index + 1),
          new Date(lp.completed_at!).toLocaleDateString(),
          new Date(lp.completed_at!).toLocaleTimeString(),
          lp.lesson_id.substring(0, 8) + '...'
        ])

      if (lessonData.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Date', 'Time', 'Lesson ID']],
          body: lessonData,
          theme: 'striped',
          headStyles: { fillColor: [66, 66, 66] },
        })
        yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
      }
    }

    // Assignment Submissions
    if (submissions && submissions.length > 0) {
      checkPageBreak(100)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('4. ASSIGNMENT SUBMISSIONS', 20, yPos)
      yPos += 10

      const submissionData = submissions
        .filter(s => s.submitted_at)
        .map((s, index) => [
          String(index + 1),
          new Date(s.submitted_at!).toLocaleDateString(),
          s.status,
          s.grade !== null ? `${s.grade}%` : 'Pending'
        ])

      if (submissionData.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Submitted', 'Status', 'Grade']],
          body: submissionData,
          theme: 'striped',
          headStyles: { fillColor: [66, 66, 66] },
        })
        yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
      }
    }

    // Trade Logs
    if (tradeLogs && tradeLogs.length > 0) {
      checkPageBreak(100)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('5. TRADE LOG SUBMISSIONS', 20, yPos)
      yPos += 10

      const tradeData = tradeLogs.slice(0, 15).map((t, index) => [
        String(index + 1),
        new Date(t.trade_date).toLocaleDateString(),
        t.symbol,
        t.side.toUpperCase(),
        `$${Number(t.pnl).toFixed(2)}`,
        t.reflection?.substring(0, 30) + '...'
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Date', 'Symbol', 'Side', 'P&L', 'Reflection']],
        body: tradeData,
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] },
      })
      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
    }

    // Rebuttal Statement
    checkPageBreak(80)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('6. DISPUTE REBUTTAL', 20, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const rebuttalText = `This document provides comprehensive evidence that the student (${studentName}) ` +
      `received and actively engaged with the educational service provided.\n\n` +
      `Key Evidence Points:\n\n` +
      `1. Enrolled on ${new Date(enrollment.enrolled_at).toLocaleDateString()} and accepted terms of service\n` +
      `2. Achieved ${completionPercentage}% course completion (${completedLessons}/${totalLessons} lessons)\n` +
      `3. Completed ${completedLessons} lessons demonstrating active participation\n` +
      `4. Submitted ${totalAssignments} assignments receiving feedback and grades\n` +
      `5. Submitted ${totalTradeLogs} trade logs with reflections\n` +
      `6. Engaged with the instructor through ${totalMessages} messages\n` +
      `7. Was last active ${daysSinceLastActive} days ago\n\n` +
      `This constitutes friendly fraud. The cardholder received the promised service, ` +
      `actively engaged with it, and is now attempting to receive a refund while ` +
      `retaining access to the knowledge gained.`

    doc.text(rebuttalText, 20, yPos, { maxWidth: 170 })
    yPos += doc.splitTextToSize(rebuttalText, 170).length * 5 + 15

    // Conclusion
    checkPageBreak(50)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('CONCLUSION:', 20, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const conclusionText = `Based on the comprehensive evidence provided, we respectfully request that ` +
      `this chargeback be reversed in favor of the merchant. The cardholder received ` +
      `full access to the course, actively participated, made substantial progress, and ` +
      `benefited from the instruction provided. The claim is without merit.`

    doc.text(conclusionText, 20, yPos, { maxWidth: 170 })
    yPos += 30

    // Footer
    checkPageBreak(30)
    doc.setFontSize(9)
    doc.setTextColor(128, 128, 128)
    doc.text(`Document Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 5
    doc.text(`Generated by: ${user.email}`, 20, yPos)
    yPos += 5
    doc.text(`Total Pages: ${doc.getNumberOfPages()}`, 20, yPos)

    // ============================================
    // SAVE PDF TO SUPABASE STORAGE
    // ============================================
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const fileName = `dispute-evidence-${studentId}-${Date.now()}.pdf`

    // #region agent log
    console.log('[DEBUG:UPLOAD_START]', JSON.stringify({fileName,userId:user.id,pdfSize:pdfBuffer.byteLength}));
    // #endregion

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dispute-evidence')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    // #region agent log
    console.log('[DEBUG:UPLOAD_RESULT]', JSON.stringify({success:!uploadError,errorMessage:uploadError?.message,errorStatus:(uploadError as any)?.status}));
    // #endregion

    if (uploadError) {
      console.error('Upload error:', uploadError)
      // #region agent log
      console.log('[DEBUG:UPLOAD_FALLBACK]', JSON.stringify({errorMessage:uploadError.message,returningBase64:true}));
      // #endregion
      // Return PDF as base64 if storage upload fails
      const base64 = pdfBuffer.toString('base64')
      
      // Build summary for client display (same as successful path)
      const fallbackSummary: EvidenceSummary = {
        totalLogins,
        completedLessons,
        totalLessons,
        completionPercentage,
        totalAssignments,
        totalTradeLogs,
        totalMessages,
        avgEngagementScore: avgEngagement.toFixed(0),
        daysSinceLastActive,
        totalTimeSpent: `${Math.floor(totalMinutesSpent / 60)}h ${totalMinutesSpent % 60}m`,
        enrollmentDate: enrollment.enrolled_at,
        lastActiveDate: lastActive
      }
      
      return NextResponse.json({
        success: true,
        downloadUrl: `data:application/pdf;base64,${base64}`,
        fileName,
        storageError: uploadError.message,
        summary: fallbackSummary
      })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('dispute-evidence')
      .getPublicUrl(fileName)

    // ============================================
    // SAVE RECORD TO DATABASE
    // ============================================
    const evidenceSummary: EvidenceSummary = {
      totalLogins,
      completedLessons,
      totalLessons,
      completionPercentage,
      totalAssignments,
      totalTradeLogs,
      totalMessages,
      avgEngagementScore: avgEngagement.toFixed(0),
      daysSinceLastActive,
      totalTimeSpent: `${Math.floor(totalMinutesSpent / 60)}h ${totalMinutesSpent % 60}m`,
      enrollmentDate: enrollment.enrolled_at,
      lastActiveDate: lastActive
    }

    const { data: documentRecord, error: dbError } = await supabase
      .from('dispute_evidence_documents')
      .insert({
        user_id: studentId,
        course_id: courseId,
        generated_by: user.id,
        file_name: fileName,
        file_url: publicUrl,
        file_size_bytes: pdfBuffer.byteLength,
        evidence_summary: evidenceSummary,
        dispute_reason: disputeReason || null,
        dispute_amount: disputeAmount || null
      })
      .select()
      .single()

    // #region agent log
    console.log('[DEBUG:DB_INSERT]', JSON.stringify({success:!dbError,documentId:documentRecord?.id,dbError:dbError?.message}));
    // #endregion

    return NextResponse.json({
      success: true,
      downloadUrl: publicUrl,
      fileName,
      documentId: documentRecord?.id,
      summary: evidenceSummary
    })

  } catch (error: unknown) {
    console.error('Error generating dispute evidence:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate dispute evidence'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

