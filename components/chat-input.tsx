"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage("")
    }
  }

  return (
    <div className="border-t border-border p-6">
      <form onSubmit={handleSubmit} className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything you'd like to learn..."
            disabled={disabled}
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>
        <Button
          type="submit"
          disabled={!message.trim() || disabled}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
