"use client"
import React, { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle, XCircle, HelpCircle } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

interface QuizCardProps {
  onComplete: (score: number) => void
  quizData: {
    quiz: {
      id: string
      question: string
      options: string[]
      answerIndex: number
      hint?: string
      explanation?: string
      chatId?: string
      chatTitle?: string
    }[]
  }
  currentQuestion?: number
  onQuestionChange?: (idx: number) => void
  onSeeChat?: (chatId: string) => void
}

export { QuizCard }

function QuizCard({ onComplete, quizData, currentQuestion: externalCurrentQuestion, onQuestionChange, onSeeChat }: QuizCardProps) {
  const [internalCurrentQuestion, setInternalCurrentQuestion] = useState(0)
  const actualCurrentQuestion = typeof externalCurrentQuestion === 'number' ? externalCurrentQuestion : internalCurrentQuestion
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [scoreArr, setScoreArr] = useState<number[]>(Array(quizData.quiz.length).fill(0))
  const [completed, setCompleted] = useState(false)
  // Reset score array and state when quizData or question set changes
  React.useEffect(() => {
    setScoreArr(Array(quizData.quiz.length).fill(0));
    setInternalCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setCompleted(false);
  }, [quizData.quiz, quizData.quiz.length]);

  const currentQ = !completed ? quizData.quiz[actualCurrentQuestion] : undefined;
  const isCorrect = currentQ && selectedAnswer === currentQ.answerIndex;

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index)
  }

  const handleCheckAnswer = () => {
    if (!currentQ) return;
    setShowResult(true);
    setScoreArr((prev) => {
      const updated = [...prev];
  updated[actualCurrentQuestion] = selectedAnswer !== null && selectedAnswer === currentQ.answerIndex ? 1 : 0;
      return updated;
    });
  }

  const handleNextQuestion = () => {
  if (actualCurrentQuestion < quizData.quiz.length - 1) {
      if (onQuestionChange) {
  onQuestionChange(actualCurrentQuestion + 1);
      } else {
  setInternalCurrentQuestion(actualCurrentQuestion + 1);
      }
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setCompleted(true);
      onComplete(scoreArr.reduce((a, b) => a + b, 0) + (selectedAnswer !== null && currentQ && selectedAnswer === currentQ.answerIndex ? 1 : 0));
    }
  }

  if (completed) {
  const finalScore = scoreArr.reduce((a, b) => a + b, 0) + (selectedAnswer !== null && currentQ && selectedAnswer === currentQ.answerIndex ? 1 : 0);
    return (
      <Card className="bg-card border-primary/20 p-8 max-w-2xl mx-auto shadow-xl">
        <div className="space-y-6 text-center">
          <h3 className="text-xl font-serif font-semibold text-primary">Quiz Complete!</h3>
          <p className="text-lg text-muted-foreground">Final Score: {finalScore}/{quizData.quiz.length}</p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="bg-card border-primary/20 p-8 max-w-2xl mx-auto shadow-xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-serif font-semibold text-primary">Knowledge Check</h3>
          <p className="text-sm text-muted-foreground">
            Question {actualCurrentQuestion + 1} of {quizData.quiz.length}
          </p>
            {quizData.quiz[actualCurrentQuestion]?.chatTitle && (
            <div className="text-xs text-muted-foreground mt-1">
              From: <span className="font-semibold">{quizData.quiz[actualCurrentQuestion].chatTitle}</span>
              {quizData.quiz[actualCurrentQuestion].chatId && onSeeChat && (
                <>
                  {" "}
                  <button
                    className="text-primary underline ml-2"
                    onClick={() => onSeeChat(quizData.quiz[actualCurrentQuestion].chatId!)}
                  >See Chat</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Question */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-foreground leading-relaxed">
            {currentQ && <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{currentQ.question}</ReactMarkdown>}
          </h4>

          {/* Options */}
          <div className="space-y-3">
            {currentQ && currentQ.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !showResult && handleAnswerSelect(index)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedAnswer === index
                    ? showResult
                      ? isCorrect
                        ? "border-green-500 bg-green-500/10 text-green-400"
                        : "border-red-500 bg-red-500/10 text-red-400"
                      : "border-primary bg-primary/10 text-primary"
                    : showResult && index === currentQ.answerIndex
                      ? "border-green-500 bg-green-500/10 text-green-400"
                      : "border-border hover:border-primary/50 text-foreground hover:bg-primary/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="prose text-foreground">
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{option}</ReactMarkdown>
                  </div>
                  {showResult &&
                    selectedAnswer === index &&
                    (isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />)}
                  {showResult && index === currentQ.answerIndex && selectedAnswer !== index && (
                    <CheckCircle className="w-5 h-5" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* No hint UI as per request */}

          {/* Explanation */}
          {showResult && (
            <div className="bg-card border border-border p-4 rounded-lg">
              <div className="text-sm text-foreground leading-relaxed">
                <span className="font-medium text-primary">Explanation: </span>
                <div className="mt-2 prose prose-invert">
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{currentQ?.explanation || ''}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          {!showResult ? (
            <Button
              onClick={handleCheckAnswer}
              disabled={selectedAnswer === null}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Check Answer
            </Button>
          ) : (
            <Button onClick={handleNextQuestion} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {actualCurrentQuestion < quizData.quiz.length - 1 ? "Next Question" : "Complete Quiz"}
            </Button>
          )}
        </div>

        {/* Score */}
        {showResult && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Current Score: {scoreArr.reduce((a, b) => a + b, 0)}/{quizData.quiz.length}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
