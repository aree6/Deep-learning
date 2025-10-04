"use client"

import { MessageSquare, Brain, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatRelativeTime } from "@/lib/utils"

interface Chat {
  id: string
  title: string
  timestamp: string
}

interface Quiz {
  id: string
  topic: string
  questionCount: number
  timestamp: string
}

interface SidebarProps {
  chats: Chat[]
  quizzes: Quiz[]
  currentChatId: string | null
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onSelectQuiz: (quizId: string) => void
  activeRecallMode?: boolean
  onActiveRecall?: () => void
}

export function Sidebar({
  chats,
  quizzes,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onSelectQuiz,
  activeRecallMode,
  onActiveRecall,
}: SidebarProps) {
  return (
    <div className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">

      {/* Header + Active Recall Button */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-semibold text-sidebar-foreground text-lg">Learning Hub</h2>
          <Button onClick={onNewChat} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          className={`w-full flex items-center justify-start gap-2 mt-2 font-semibold ${activeRecallMode ? 'bg-sidebar-accent text-sidebar-primary ring-2 ring-primary' : 'bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-primary'}`}
          onClick={onActiveRecall}
          data-active={activeRecallMode}
        >
          <Brain className="w-4 h-4" />
          Active Recall
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <MessageSquare className="w-4 h-4 text-sidebar-primary" />
            <h3 className="text-sm font-medium text-sidebar-foreground">Recent Chats</h3>
          </div>
          <div className="space-y-1">
            {chats.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No chats yet. Start learning!</p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    currentChatId === chat.id
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "hover:bg-sidebar-accent text-sidebar-foreground"
                  }`}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{chat.title}</p>
                    <p className="text-[10px] text-muted-foreground">{formatRelativeTime(chat.timestamp)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat(chat.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-sidebar-border rounded transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
