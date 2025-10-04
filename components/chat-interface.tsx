"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { ChatArea } from "@/components/chat-area"

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

export function ChatInterface() {
  const [chats, setChats] = useState<Chat[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)

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
    setCurrentChatId(chatId)
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
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <ChatArea
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode(!focusMode)}
          chatId={currentChatId}
          onSaveQuiz={handleSaveQuiz}
          onMessagesUpdate={(chatId, messages) => {
            // Update the corresponding chat's messages in memory so switching
            // between chats preserves the conversation in UI state.
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
            // If the chat still has the default title, set it to the first user prompt
            setChats((prev) => {
              const idx = prev.findIndex((c) => c.id === chatId)
              if (idx === -1) return prev
              const chat = prev[idx]
              const defaultTitle = 'New Learning Session'
              // If the current title is the default or empty, set to first prompt (truncate)
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
