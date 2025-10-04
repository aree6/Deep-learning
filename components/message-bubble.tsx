"use client"

import type { UIMessage } from "ai"
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

interface MessageBubbleProps {
  message: UIMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === "user") {
    const userText = message.parts.find((part) => part.type === "text")?.text || ""
    return (
      <div className="flex justify-end">
        <div className="bg-secondary text-secondary-foreground px-6 py-4 rounded-2xl rounded-br-md max-w-md shadow-lg">
          <p className="text-sm font-medium">{userText}</p>
        </div>
      </div>
    )
  }

  // AI message
  const aiText = message.parts.find((part) => part.type === "text")?.text || ""
  const isLoading = (message as any).loading === true
  return (
    <div className="flex justify-start">
      <div className="bg-surface border border-primary/20 px-8 py-6 rounded-2xl rounded-bl-md max-w-4xl shadow-lg backdrop-blur-sm">
        {isLoading ? (
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-sm text-muted-foreground">AI is typing...</span>
          </div>
        ) : (
          <div className="prose text-foreground leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{aiText}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
