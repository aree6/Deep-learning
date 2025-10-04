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
  const [recallQuestions, setRecallQuestions] = useState<any[]>([])
  const [recallProgress, setRecallProgress] = useState<number>(0)

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
            // Restore session if available
            const sessionRaw = window.sessionStorage.getItem('activeRecallSession');
            if (sessionRaw) {
              const session = JSON.parse(sessionRaw);
              setRecallQuestions(session.questions || []);
              setRecallProgress(session.progress || 0);
              setSelectedTimeFrame(session.timeFrame || null);
              setActiveRecallStep('quiz');
            } else {
              setActiveRecallStep('select');
            }
            setActiveRecallMode(true);
            setCurrentChatId(null);
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
                {/* Continue previous session button if available */}
                {(() => {
                  const sessionRaw = window.sessionStorage.getItem('activeRecallSession');
                  if (sessionRaw) {
                    return (
                      <button
                        className="mb-4 bg-accent text-accent-foreground rounded-lg py-2 font-medium hover:bg-accent/80 transition w-full"
                        onClick={() => {
                          const session = JSON.parse(sessionRaw);
                          setRecallQuestions(session.questions || []);
                          setRecallProgress(session.progress || 0);
                          setSelectedTimeFrame(session.timeFrame || null);
                          setActiveRecallStep('quiz');
                        }}
                      >Continue previous session</button>
                    );
                  }
                  return null;
                })()}
                <div className="flex flex-col gap-3">
                  {[1,2,3,6,'ALL'].map(option => (
                    <button
                      key={option}
                      className="bg-primary text-primary-foreground rounded-lg py-2 font-medium hover:bg-primary/90 transition"
                      onClick={() => {
                        let months: number | null = typeof option === 'number' ? option : null;
                        setSelectedTimeFrame(months);
                        // Get chats from localStorage within time frame
                        const savedChats = localStorage.getItem("learning-chats");
                        let chatsArr: Chat[] = savedChats ? JSON.parse(savedChats) : [];
                        let filtered: Chat[] = [];
                        if (months) {
                          filtered = getChatsByTimeFrame(chatsArr, months);
                        } else {
                          filtered = chatsArr;
                        }
                        // Extract all quiz questions from these chats, with chatId and chatTitle
                        let allQuestions: any[] = [];
                        filtered.forEach((chat: Chat) => {
                          const quizKey = `learning-quiz-${chat.id}`;
                          const quizRaw = localStorage.getItem(quizKey);
                          if (quizRaw) {
                            try {
                              const quiz = JSON.parse(quizRaw);
                              if (Array.isArray(quiz)) {
                                quiz.forEach((q: any) => {
                                  allQuestions.push({ ...q, chatId: chat.id, chatTitle: chat.title });
                                });
                              }
                            } catch {}
                          }
                        });
                        // Shuffle questions
                        for (let i = allQuestions.length - 1; i > 0; i--) {
                          const j = Math.floor(Math.random() * (i + 1));
                          [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
                        }
                        setRecallQuestions(allQuestions);
                        setRecallProgress(0);
                        setActiveRecallStep('quiz');
                        // Save session state
                        window.sessionStorage.setItem('activeRecallSession', JSON.stringify({ questions: allQuestions, timeFrame: months, progress: 0 }));
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
                <h2 className="text-xl font-bold mb-4 text-center">Active Recall Quiz</h2>
                {recallQuestions.length === 0 ? (
                  <p className="text-center text-muted-foreground">No quiz questions found for this time frame.</p>
                ) : (
                  <QuizCard
                    key={recallQuestions.length + '-' + recallProgress}
                    quizData={{ quiz: recallQuestions }}
                    onComplete={() => {
                      setRecallProgress(recallQuestions.length);
                      window.sessionStorage.removeItem('activeRecallSession');
                    }}
                    currentQuestion={recallProgress}
                    onQuestionChange={(idx: number) => {
                      setRecallProgress(idx);
                      window.sessionStorage.setItem('activeRecallSession', JSON.stringify({ questions: recallQuestions, timeFrame: selectedTimeFrame, progress: idx }));
                    }}
                    onSeeChat={(chatId: string) => {
                      // Use the same logic as handleSelectChat to ensure chat loads and recall mode is preserved
                      const savedChats = localStorage.getItem("learning-chats");
                      if (savedChats) {
                        setChats(JSON.parse(savedChats));
                      }
                      setCurrentChatId(chatId);
                      // Do NOT exit recall mode or step
                    }}
                  />
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
