"use client"

import { useState } from 'react'
import { 
  Trash2, 
  Plus, 
  GripVertical, 
  CheckCircle2,
  Circle,
  Type,
  ListChecks,
  ToggleLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/glass/GlassCard'
import type { QuestionType, CreateQuestionData, CreateOptionData } from '@/lib/types/quiz'

interface QuestionEditorProps {
  question: CreateQuestionData
  index: number
  onChange: (question: CreateQuestionData) => void
  onDelete: () => void
}

const questionTypeLabels: Record<QuestionType, { label: string; icon: React.ReactNode }> = {
  multiple_choice: { label: 'Multiple Choice', icon: <ListChecks className="w-4 h-4" /> },
  true_false: { label: 'True/False', icon: <ToggleLeft className="w-4 h-4" /> },
  short_answer: { label: 'Short Answer', icon: <Type className="w-4 h-4" /> }
}

export function QuestionEditor({ question, index, onChange, onDelete }: QuestionEditorProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  const handleQuestionTextChange = (text: string) => {
    onChange({ ...question, question_text: text })
  }

  const handleTypeChange = (type: QuestionType) => {
    let newOptions: CreateOptionData[] = []
    
    if (type === 'true_false') {
      newOptions = [
        { option_text: 'True', is_correct: true, order: 0 },
        { option_text: 'False', is_correct: false, order: 1 }
      ]
    } else if (type === 'multiple_choice') {
      newOptions = [
        { option_text: '', is_correct: true, order: 0 },
        { option_text: '', is_correct: false, order: 1 }
      ]
    }
    
    onChange({ 
      ...question, 
      question_type: type,
      options: newOptions,
      correct_answer_text: type === 'short_answer' ? '' : null
    })
    setShowTypeSelector(false)
  }

  const handlePointsChange = (points: number) => {
    onChange({ ...question, points: Math.max(1, points) })
  }

  const handleOptionChange = (optionIndex: number, text: string) => {
    const newOptions = [...(question.options || [])]
    newOptions[optionIndex] = { ...newOptions[optionIndex], option_text: text }
    onChange({ ...question, options: newOptions })
  }

  const handleCorrectOptionChange = (optionIndex: number) => {
    const newOptions = (question.options || []).map((opt, idx) => ({
      ...opt,
      is_correct: idx === optionIndex
    }))
    onChange({ ...question, options: newOptions })
  }

  const handleAddOption = () => {
    const newOptions = [
      ...(question.options || []),
      { option_text: '', is_correct: false, order: (question.options?.length || 0) }
    ]
    onChange({ ...question, options: newOptions })
  }

  const handleDeleteOption = (optionIndex: number) => {
    const newOptions = (question.options || []).filter((_, idx) => idx !== optionIndex)
    // Ensure at least one option is correct
    if (newOptions.length > 0 && !newOptions.some(o => o.is_correct)) {
      newOptions[0].is_correct = true
    }
    onChange({ ...question, options: newOptions })
  }

  const handleCorrectAnswerTextChange = (text: string) => {
    onChange({ ...question, correct_answer_text: text })
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div className="mt-2 cursor-grab text-[var(--text-muted)] hover:text-white">
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-4">
          {/* Question header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">
                Question {index + 1}
              </span>
              
              {/* Type selector */}
              <div className="relative">
                <button
                  onClick={() => setShowTypeSelector(!showTypeSelector)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-[var(--text-muted)] transition-colors"
                >
                  {questionTypeLabels[question.question_type].icon}
                  <span>{questionTypeLabels[question.question_type].label}</span>
                </button>
                
                {showTypeSelector && (
                  <div className="absolute top-full left-0 mt-1 z-10 bg-black/90 border border-white/10 rounded-lg shadow-xl overflow-hidden">
                    {Object.entries(questionTypeLabels).map(([type, { label, icon }]) => (
                      <button
                        key={type}
                        onClick={() => handleTypeChange(type as QuestionType)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors"
                      >
                        {icon}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Points */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={question.points || 10}
                  onChange={(e) => handlePointsChange(parseInt(e.target.value) || 10)}
                  className="w-14 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                  min="1"
                />
                <span className="text-xs text-[var(--text-muted)]">pts</span>
              </div>

              {/* Delete button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Question text */}
          <textarea
            value={question.question_text}
            onChange={(e) => handleQuestionTextChange(e.target.value)}
            placeholder="Enter your question..."
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
            rows={2}
          />

          {/* Options (for MC and T/F) */}
          {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-muted)]">
                Click the circle to mark the correct answer
              </p>
              {(question.options || []).map((option, optionIdx) => (
                <div key={optionIdx} className="flex items-center gap-2">
                  <button
                    onClick={() => handleCorrectOptionChange(optionIdx)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      option.is_correct
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    {option.is_correct && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                  </button>
                  
                  <input
                    type="text"
                    value={option.option_text}
                    onChange={(e) => handleOptionChange(optionIdx, e.target.value)}
                    placeholder={`Option ${optionIdx + 1}`}
                    disabled={question.question_type === 'true_false'}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 disabled:opacity-50"
                  />
                  
                  {question.question_type === 'multiple_choice' && (question.options?.length || 0) > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOption(optionIdx)}
                      className="text-[var(--text-muted)] hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {question.question_type === 'multiple_choice' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddOption}
                  className="text-[hsl(var(--theme-primary))]"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
          )}

          {/* Correct answer for short answer */}
          {question.question_type === 'short_answer' && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-muted)]">
                Reference answer (optional, for instructor reference only)
              </p>
              <textarea
                value={question.correct_answer_text || ''}
                onChange={(e) => handleCorrectAnswerTextChange(e.target.value)}
                placeholder="Enter expected answer for reference..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
                rows={2}
              />
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
