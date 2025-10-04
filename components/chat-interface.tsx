"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { ChatArea } from "@/components/chat-area"
import { QuizCard } from "@/components/quiz-card"

interface Chat {
  id: string
  title: string
  timestamp: string
  messages: any[]
}

interface Quiz {
  id: string
  topic: string
  questionCount: number
  timestamp: string
  questions: any[]
}

function getChatsByTimeFrame(chats: Chat[], months: number): Chat[] {
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
  return chats.filter((chat: Chat) => new Date(chat.timestamp) >= cutoff)
}

export function ChatInterface() {
  const [chats, setChats] = useState<Chat[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [activeRecallMode, setActiveRecallMode] = useState(false)
  const [activeRecallStep, setActiveRecallStep] = useState<'select'|'quiz'|null>(null)
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<number|null>(null)
  const [recallChats, setRecallChats] = useState<Chat[]>([])
  const [recallQuizzes, setRecallQuizzes] = useState<any[]>([])

  // Load chats and quizzes from localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem("learning-chats")
    const savedQuizzes = localStorage.getItem("learning-quizzes")

    if (savedChats) {
      setChats(JSON.parse(savedChats))
    }
    if (savedQuizzes) {
      setQuizzes(JSON.parse(savedQuizzes))
    }
  }, [])

  // Save chats to localStorage
  useEffect(() => {
    try {
      if (!chats || chats.length === 0) {
        localStorage.removeItem("learning-chats")
        return
      }
      localStorage.setItem("learning-chats", JSON.stringify(chats))
    } catch (e) {
      console.warn('[v0] Could not persist chats to localStorage', e)
    }
  }, [chats])

  // Save quizzes to localStorage
  useEffect(() => {
    try {
      if (!quizzes || quizzes.length === 0) {
        localStorage.removeItem("learning-quizzes")
        return
      }
      localStorage.setItem("learning-quizzes", JSON.stringify(quizzes))
    } catch (e) {
      console.warn('[v0] Could not persist quizzes to localStorage', e)
    }
  }, [quizzes])

  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Learning Session",
      timestamp: new Date().toISOString(),
      messages: [],
    }
    setChats([newChat, ...chats])
    setCurrentChatId(newChat.id)
  }

  const handleSelectChat = (chatId: string) => {
    // Always reload chats from localStorage to avoid stale/empty state
    const savedChats = localStorage.getItem("learning-chats")
    if (savedChats) {
      setChats(JSON.parse(savedChats))
    }
    setCurrentChatId(chatId)
    setActiveRecallMode(false)
    setActiveRecallStep(null)
  }

  const handleDeleteChat = (chatId: string) => {
    setChats(chats.filter((chat) => chat.id !== chatId))
    if (currentChatId === chatId) {
      setCurrentChatId(null)
    }
  }

  const handleSelectQuiz = (quizId: string) => {
    // TODO: Implement quiz modal/view
    console.log("Selected quiz:", quizId)
  }

  const handleSaveQuiz = (topic: string, questions: any[]) => {
    const newQuiz: Quiz = {
      id: Date.now().toString(),
      topic,
      questionCount: questions.length,
      timestamp: new Date().toISOString(),
      questions,
    }
    setQuizzes([newQuiz, ...quizzes])
  }

  const currentChat = chats.find((chat) => chat.id === currentChatId)

  return (
    <div className={`min-h-screen bg-background flex ${focusMode ? "focus-mode active" : "focus-mode"}`}> 
      {/* Sidebar */}
      {!focusMode && (
        <Sidebar
          chats={chats}
          quizzes={quizzes}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onSelectQuiz={handleSelectQuiz}
          activeRecallMode={activeRecallMode}
          onActiveRecall={() => {
            setActiveRecallMode(true)
            setActiveRecallStep('select')
            setCurrentChatId(null)
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {activeRecallMode ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8">
            {activeRecallStep === 'select' && (
              <div className="max-w-md w-full bg-card p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4 text-center">Active Recall</h2>
                <p className="mb-4 text-center">Select a time frame to review quizzes from your past chats:</p>
                <div className="flex flex-col gap-3">
                  {[1,2,3,6,'ALL'].map(option => (
                    <button
                      key={option}
                      className="bg-primary text-primary-foreground rounded-lg py-2 font-medium hover:bg-primary/90 transition"
                      onClick={() => {
                        let months: number | null = typeof option === 'number' ? option : null
                        setSelectedTimeFrame(months)
                        // Get chats from localStorage within time frame
                        const savedChats = localStorage.getItem("learning-chats")
                        let chatsArr: Chat[] = savedChats ? JSON.parse(savedChats) : []
                        let filtered: Chat[] = []
                        if (months) {
                          filtered = getChatsByTimeFrame(chatsArr, months)
                        } else {
                          filtered = chatsArr
                        }
                        setRecallChats(filtered)
                        // Extract quizzes from these chats
                        let quizzesArr: { chatId: string, chatTitle: string, questions: any[] }[] = []
                        filtered.forEach((chat: Chat) => {
                          const quizKey = `learning-quiz-${chat.id}`
                          const quizRaw = localStorage.getItem(quizKey)
                          if (quizRaw) {
                            try {
                              const quiz = JSON.parse(quizRaw)
                              if (Array.isArray(quiz)) {
                                quizzesArr.push({ chatId: chat.id, chatTitle: chat.title, questions: quiz })
                              }
                            } catch {}
                          }
                        })
                        setRecallQuizzes(quizzesArr)
                        setActiveRecallStep('quiz')
                      }}
                    >
                      {option === 'ALL' ? 'All Time' : `Last ${option} month${option !== 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
                <button
                  className="mt-6 text-sm text-muted-foreground underline hover:text-primary"
                  onClick={() => {
                    setActiveRecallMode(false)
                    setActiveRecallStep(null)
                  }}
                >Back to chats</button>
              </div>
            )}
            {activeRecallStep === 'quiz' && (
              <div className="max-w-2xl w-full bg-card p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4 text-center">Retake Quizzes</h2>
                {recallQuizzes.length === 0 ? (
                  <p className="text-center text-muted-foreground">No quizzes found for this time frame.</p>
                ) : (
                  <div className="space-y-10">
                    {recallQuizzes.map((qz, idx) => (
                      <div key={qz.chatId} className="border-b pb-8 mb-8">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-semibold">{qz.chatTitle || 'Untitled Chat'}</span>
                            <span className="ml-2 text-xs text-muted-foreground">(Chat ID: {qz.chatId})</span>
                          </div>
                          <a
                            href="#"
                            className="text-primary underline text-xs"
                            onClick={e => {
                              e.preventDefault()
                              handleSelectChat(qz.chatId)
                            }}
                          >See Chat</a>
                        </div>
                        {/* Interactive QuizCard for retake */}
                        {qz.questions && Array.isArray(qz.questions) && qz.questions.length > 0 ? (
                          <QuizCard
                            key={qz.chatId + '-quizcard'}
                            quizData={{ quiz: qz.questions }}
                            onComplete={() => {}}
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground">No questions found.</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="mt-6 text-sm text-muted-foreground underline hover:text-primary"
                  onClick={() => setActiveRecallStep('select')}
                >Back to time frames</button>
              </div>
            )}
          </div>
        ) : (
          <ChatArea
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode(!focusMode)}
            chatId={currentChatId}
            onSaveQuiz={handleSaveQuiz}
            onMessagesUpdate={(chatId, messages) => {
              setChats((prev) => {
                const idx = prev.findIndex((c) => c.id === chatId)
                const next = [...prev]
                if (idx >= 0) {
                  next[idx] = { ...next[idx], messages }
                } else {
                  next.unshift({ id: chatId, title: 'Learning Session', timestamp: new Date().toISOString(), messages })
                }
                return next
              })
            }}
            onFirstUserMessage={(chatId, firstPrompt) => {
              setChats((prev) => {
                const idx = prev.findIndex((c) => c.id === chatId)
                if (idx === -1) return prev
                const chat = prev[idx]
                const defaultTitle = 'New Learning Session'
                if (!chat.title || chat.title === defaultTitle || chat.title === 'Learning Session') {
                  const newTitle = firstPrompt.length > 60 ? firstPrompt.slice(0, 57) + '...' : firstPrompt
                  const next = [...prev]
                  next[idx] = { ...next[idx], title: newTitle }
                  return next
                }
                return prev
              })
            }}
          />
        )}
      </div>

      {/* Focus Mode Exit */}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed top-4 right-4 bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded-lg transition-colors"
        >
          Exit Focus
        </button>
      )}
    </div>
  )
}
