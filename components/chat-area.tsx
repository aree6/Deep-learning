"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { MessageBubble } from "@/components/message-bubble"
import { ChatInput } from "@/components/chat-input"
import { QuizCard } from "@/components/quiz-card"
import { Focus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

interface ChatAreaProps {
  focusMode: boolean
  onToggleFocus: () => void
  chatId: string | null
  onSaveQuiz: (topic: string, questions: any[]) => void
  onMessagesUpdate?: (chatId: string, messages: any[]) => void
  onFirstUserMessage?: (chatId: string, firstPrompt: string) => void
}


export function ChatArea({ focusMode, onToggleFocus, chatId, onSaveQuiz, onMessagesUpdate, onFirstUserMessage }: ChatAreaProps) {
  const { sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })
  // Internal messages state, decoupled from useChat's messages
  const [messages, setMessages] = useState<any[]>([])
  const [rawApiMessages, setRawApiMessages] = useState<any[]>([])
  const [generatedQuiz, setGeneratedQuiz] = useState<any[] | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)

  // Parse various server response shapes into a single readable text string.
  // Handles NDJSON event stream lines like:
  // {"type":"text-delta","id":"...","delta":"..."}\n
  // Parse the API response into structured text and optional quizzes.
  // Returns { cleanText, quizzes }
  const parseApiResponseToText = (bodyText: string): { cleanText: string; quizzes: any[] } => {
    if (!bodyText) return { cleanText: "", quizzes: [] }

    // If the provider wrapped the whole stream in triple quotes or in a
    // JSON string (e.g. "{...}\n{...}"), unwrap it so we can parse events.
    let normalized = bodyText
    // Trim surrounding whitespace
    normalized = normalized.trim()

    // Strip triple-quote wrappers if present
    if ((normalized.startsWith('"""') && normalized.endsWith('"""')) || (normalized.startsWith("'''") && normalized.endsWith("'''") )) {
      normalized = normalized.slice(3, -3).trim()
    }

    // If the body is a JSON string (starts and ends with a quote), try to parse
    // it to unescape embedded JSON sequences like "{\"type\":...}"
    if ((normalized.startsWith('"') && normalized.endsWith('"')) || (normalized.startsWith("'") && normalized.endsWith("'"))) {
      try {
        const parsed = JSON.parse(normalized)
        if (typeof parsed === 'string') normalized = parsed
      } catch (e) {
        // ignore parse error and fall back to stripping quotes
        normalized = normalized.replace(/^['"]|['"]$/g, '')
      }
    }

    // Helper: extract successive JSON objects from a string even if they're
    // concatenated or separated by spaces. This walks the string and finds
    // balanced {...} substrings.
    const extractJsonObjects = (text: string) => {
      const objs: string[] = []
      let i = 0
      while (i < text.length) {
        // Skip whitespace
        while (i < text.length && /\s/.test(text[i])) i++
        if (i >= text.length) break

        if (text[i] === '{' || text[i] === '[') {
          let depth = 0
          let start = i
          let j = i
          for (; j < text.length; j++) {
            if (text[j] === '{' || text[j] === '[') depth++
            else if (text[j] === '}' || text[j] === ']') {
              depth--
              if (depth === 0) {
                objs.push(text.slice(start, j + 1))
                i = j + 1
                break
              }
            }
          }
          if (j >= text.length) break
          continue
        }

        // If it doesn't start with {, consume until next whitespace or brace
        let start = i
        while (i < text.length && text[i] !== '{' && !/\r|\n/.test(text[i])) i++
        objs.push(text.slice(start, i))
      }
      return objs
    }

  const parts = extractJsonObjects(normalized)
  const chunks: string[] = []
  let foundQuizzes: any[] = []

    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed) continue
      if (trimmed === "[DONE]") continue

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const obj = JSON.parse(trimmed)
          if (Array.isArray(obj)) {
            for (const item of obj) {
              if (item && typeof item === 'object') {
                if (typeof item.delta === 'string') chunks.push(item.delta)
                else if (typeof item.text === 'string') chunks.push(item.text)
              }
            }
            continue
          }
          if (obj && typeof obj === 'object') {
            // If the model returned a top-level quizzes object, capture it
            if (Array.isArray((obj as any).quizzes) && (obj as any).quizzes.length > 0) {
              foundQuizzes = (obj as any).quizzes
              // don't append this object to visible chunks
              continue
            }
            // Ignore pure control events
            if (obj.type && (obj.type === 'text-start' || obj.type === 'text-end')) continue
            if (typeof obj.delta === 'string') {
              chunks.push(obj.delta)
              continue
            }
            if (typeof obj.text === 'string') {
              chunks.push(obj.text)
              continue
            }
            if (obj.response && typeof obj.response === 'object' && typeof obj.response.text === 'string') {
              chunks.push(obj.response.text)
              continue
            }
          }
        } catch (e) {
          // parsing failed; fall through to treat as plain text
        }
      }

      // Sometimes a control event may be present as a plain line (not valid
      // JSON) like {"type":"text-start","id":"..."}. Ignore those via
      // regex so the user doesn't see them.
      const controlEventRegex = /\{\s*"type"\s*:\s*"text-(start|end)"[\s\S]*\}/i
      if (controlEventRegex.test(trimmed)) continue

      // treat as plain text chunk
      chunks.push(trimmed)
    }

    let cleanText = chunks.length ? chunks.join('') : bodyText

    // Look for a trailing ```json ... ``` block and parse it
    const jsonFenceRegex = /```json\s*([\s\S]*?)```\s*$/i
    const jsonMatch = cleanText.match(jsonFenceRegex)
    let quizzes: any[] = []
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        if (parsed && Array.isArray(parsed.quizzes)) {
          quizzes = parsed.quizzes
        }
      } catch (e) {
        // ignore JSON parse errors
      }

      // Remove the JSON fence from cleanText
      cleanText = cleanText.replace(jsonFenceRegex, '').trim()
    }

    // If we found a top-level quizzes object earlier while parsing JSON parts,
    // prefer that over a trailing fenced JSON block.
    if (foundQuizzes && foundQuizzes.length > 0) {
      quizzes = foundQuizzes
    }

    return { cleanText, quizzes }
  }

  // DEV-only quick check: when running locally in non-production, log parser
  // behavior for a canned example so it's easy to verify quizzes extraction.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const sample = `{"type":"text-delta","id":"1","delta":"Here is an explanation..."}\n{"quizzes":[{"question":"Q1","options":{"A":"1","B":"2","C":"3","D":"4"},"correctAnswer":"B","explanation":"Because..."}]}`
      const parsed = parseApiResponseToText(sample)
      console.log('[v0][dev-sanity] parseApiResponseToText sample ->', parsed)
    } catch (e) {
      // noop
    }
  }

  useEffect(() => {
    console.log("[v0] Messages updated:", messages.length)
  }, [messages])

  useEffect(() => {
    console.log("[v0] Status:", status)
  }, [status])

  // Reset messages and quiz when chatId changes: load from localStorage or empty for new chat
  useEffect(() => {
    if (!chatId) {
      setMessages([])
      setGeneratedQuiz(null)
      return
    }
    try {
      const raw = localStorage.getItem('learning-chats')
      if (!raw) {
        setMessages([])
        setGeneratedQuiz(null)
        return
      }
      const chats = JSON.parse(raw)
      const found = chats.find((c: any) => c.id === chatId)
      if (found && Array.isArray(found.messages)) {
        setMessages(found.messages)
        if (typeof onMessagesUpdate === 'function') {
          onMessagesUpdate(chatId, found.messages)
        }
      } else {
        setMessages([])
      }
      // Load quiz for this chat from localStorage
      const quizKey = `learning-quiz-${chatId}`
      const quizRaw = localStorage.getItem(quizKey)
      if (quizRaw) {
        try {
          const quiz = JSON.parse(quizRaw)
          if (Array.isArray(quiz)) {
            setGeneratedQuiz(quiz)
          } else {
            setGeneratedQuiz(null)
          }
        } catch {
          setGeneratedQuiz(null)
        }
      } else {
        setGeneratedQuiz(null)
      }
    } catch (e) {
      setMessages([])
      setGeneratedQuiz(null)
      console.warn('[v0] Could not load messages or quiz from localStorage', e)
    }
  }, [chatId])

  // Persist messages for the current chat into localStorage whenever they change
  useEffect(() => {
    try {
      if (!chatId) return
      const key = 'learning-chats'
      const raw = localStorage.getItem(key)
      const chats = raw ? JSON.parse(raw) : []
      const idx = chats.findIndex((c: any) => c.id === chatId)
      const toSave = Array.isArray(messages) ? messages : []
      if (idx >= 0) {
        chats[idx].messages = toSave
      } else {
        // If the chat doesn't exist in the list yet, create a minimal entry
        chats.unshift({
          id: chatId,
          title: 'Learning Session',
          timestamp: new Date().toISOString(),
          messages: toSave,
        })
      }
      localStorage.setItem(key, JSON.stringify(chats))
      // notify parent that messages changed so it can keep its in-memory chats synced
      if (typeof onMessagesUpdate === 'function') {
        onMessagesUpdate(chatId, toSave)
      }
    } catch (e) {
      console.warn('[v0] Could not persist messages to localStorage', e)
    }
  }, [messages, chatId])

  const handleSendMessage = async (content: string) => {
    console.log("[v0] Sending message (fallback fetch):", content)
    try {
      // Append an optimistic user message so the UI shows what the user sent.
      const userMsg = {
        id: `local-user-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        role: "user",
        parts: [{ type: "text", text: content }],
      }

      let wasEmpty = false
      try {
        wasEmpty = !messages || messages.length === 0
      } catch (_) {
        wasEmpty = false
      }

      try {
        setMessages((prev: any[]) => [...prev, userMsg])
      } catch (err) {
        console.warn("[v0] Could not append optimistic user message:", err)
      }

      // If this is the first user message in the chat, notify parent so it can set the chat title
      if (wasEmpty && chatId && typeof onFirstUserMessage === 'function') {
        try {
          onFirstUserMessage(chatId, content)
        } catch (e) {
          console.warn('[v0] onFirstUserMessage handler threw', e)
        }
      }

      // Create an optimistic assistant placeholder with loading indicator so the
      // user immediately sees a response bubble with a loader.
      const placeholderId = `local-assistant-${Date.now()}-${Math.floor(Math.random() * 10000)}`
      const assistantPlaceholder = {
        id: placeholderId,
        role: "assistant",
        loading: true,
        parts: [{ type: "text", text: "" }],
      }

      try {
        setMessages((prev: any[]) => [...prev, assistantPlaceholder])
      } catch (err) {
        console.warn("[v0] Could not append assistant placeholder:", err)
      }
      // Keep this very simple: call the API directly and append whatever it returns.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content }] }),
      })

      // Prefer text so we show whatever the server sent (JSON, text, etc.)
      const bodyText = await res.text()

      // Convert the raw server response (NDJSON/JSON/plain) into readable text
      const humanText = parseApiResponseToText(bodyText)


      // Extract quizzes from the assistant text (but don't show them inline)
      const extractQuizzesFromText = (text: string) => {
        const quizzes: any[] = []
        let clean = text

        const quizBlockRegex = /\*\*Quiz Question\s*\d+:\*\*([\s\S]*?)(?=(\*\*Quiz Question|$))/gi
        let match
        while ((match = quizBlockRegex.exec(text)) !== null) {
          const block = match[1].trim()

          // Collect option lines labeled A)-D)
          const optionLineRegex = /^[ \t]*([A-D])\)[ \t]*(.+)$/gim
          const optionMap: Record<string, string> = {}
          let m: RegExpExecArray | null
          while ((m = optionLineRegex.exec(block)) !== null) {
            const letter = m[1].toUpperCase()
            const content = m[2].trim()
            optionMap[letter] = content
          }

          // Build options array ordered A..D
          const options = ['A', 'B', 'C', 'D'].map((L) => optionMap[L] ?? '')

          // Extract question text: everything before the first option line
          const firstOptionIndex = block.search(/^[ \t]*[A-D]\)/m)
          let questionText = ''
          if (firstOptionIndex !== -1) {
            questionText = block.slice(0, firstOptionIndex).trim().replace(/\n+/g, ' ')
          } else {
            // Fallback: use first non-empty line
            const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
            questionText = lines[0] ?? ''
          }

          // Find correct answer letter robustly
          let correctLetterMatch = block.match(/Correct Answer:\s*([A-D])\b/i)?.[1]
          if (!correctLetterMatch) {
            // Try variants like "Correct Answer: C)" or "Correct Answer - C"
            correctLetterMatch = block.match(/Correct Answer[:\-]\s*\(?([A-D])\)?/i)?.[1]
          }
          const correctLetter = (correctLetterMatch || '').toUpperCase()
          const answerIndexMap: any = { A: 0, B: 1, C: 2, D: 3 }
          const answerIndex = typeof answerIndexMap[correctLetter] === 'number' ? answerIndexMap[correctLetter] : 0

          const explanationMatch = block.match(/Explanation:\s*([\s\S]*)/i)
          const explanation = explanationMatch ? explanationMatch[1].trim() : ''

          quizzes.push({
            id: `q-${quizzes.length}-${Date.now()}`,
            question: questionText || `Question ${quizzes.length + 1}`,
            options,
            answerIndex,
            explanation,
          })

          clean = clean.replace(match[0], '')
        }

        return { cleanText: clean.trim(), quizzes }
      }

      // parseApiResponseToText now returns { cleanText, quizzes }
      const { cleanText: parsedCleanText, quizzes: parsedQuizzesFromJson } = (() => {
        try {
          return parseApiResponseToText(bodyText)
        } catch (e) {
          return { cleanText: '', quizzes: [] }
        }
      })()


      // Remove any trailing quiz JSON block from the assistant's message
      let humanTextFinal = parsedCleanText
      // Remove ```json ... ``` block at the end if present
      const jsonFenceRegex = /```json\s*([\s\S]*?)```\s*$/i
      humanTextFinal = humanTextFinal.replace(jsonFenceRegex, '').trim()

      const { cleanText, quizzes } = (parsedQuizzesFromJson && parsedQuizzesFromJson.length > 0)
        ? { cleanText: humanTextFinal, quizzes: parsedQuizzesFromJson }
        : extractQuizzesFromText(humanTextFinal)

      // Replace the assistant placeholder (by id) with the real assistant message (without quiz blocks)
      const realMsg = {
        id: `raw-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        role: "assistant",
        parts: [{ type: "text", text: cleanText }],
      }

      try {
        setMessages((prev: any[]) => prev.map((m: any) => (m.id === placeholderId ? realMsg : m)))
        if (quizzes && quizzes.length > 0) {
          // Normalize quizzes: accept either { correctAnswer: 'A' } or { answerIndex: 0 }
          const normalized = quizzes.map((q: any) => {
            // Build options array in flexible ways:
            // - If options is an array, use it
            // - If options is an object with keys A..D use those
            // - If options is a string, split into lines and extract option text
            let opts: string[] = []
            if (Array.isArray(q.options)) {
              opts = q.options.slice(0, 4)
            } else if (q.options && typeof q.options === 'object') {
              const letters = ['A', 'B', 'C', 'D']
              opts = letters.map((L) => {
                const v = q.options[L] ?? q.options[L.toLowerCase()]
                if (typeof v === 'string') return v
                // support nested { text: '...' }
                if (v && typeof v === 'object' && typeof v.text === 'string') return v.text
                return ''
              })
            } else if (typeof q.options === 'string') {
              const lines = q.options
                .split(/\r?\n/)
                .map((l: string) => l.replace(/^[ \t]*[A-D][\)\:\-\.\s]*/i, '').trim())
                .filter(Boolean)
              opts = lines.slice(0, 4)
            }

            while (opts.length < 4) opts.push('')

            // Determine answer index: prefer answerIndex, then correctAnswer letter or numeric string,
            // otherwise try to match the correctAnswer text against option text.
            let answerIndex = typeof q.answerIndex === 'number' ? q.answerIndex : undefined
            if (answerIndex === undefined && typeof q.correctAnswer === 'string') {
              const raw = q.correctAnswer.trim()
              const map: any = { A: 0, B: 1, C: 2, D: 3 }
              const up = raw.toUpperCase()
              if (map[up] !== undefined) {
                answerIndex = map[up]
              } else if (/^\d+$/.test(raw)) {
                // If the model returned a 0-based or 1-based number, try to interpret
                const asNum = Number(raw)
                // If it's 1..4 assume 1-based (convert to 0-based)
                if (asNum >= 1 && asNum <= 4) answerIndex = Math.max(0, Math.min(3, asNum - 1))
                else answerIndex = Math.max(0, Math.min(3, asNum))
              } else {
                // Try to find an option whose text contains the correctAnswer phrase
                const found = opts.findIndex((o) => o && raw && o.toUpperCase().includes(raw.toUpperCase()))
                if (found !== -1) answerIndex = found
              }
            }
            if (answerIndex === undefined) answerIndex = 0

            return {
              id: q.id || `q-${Math.random().toString(36).slice(2, 9)}`,
              question: q.question || '',
              options: opts,
              answerIndex,
              explanation: q.explanation || q.explain || '',
            }
          })

          setGeneratedQuiz(normalized)
          // Persist quiz to localStorage for this chat
          if (chatId) {
            try {
              localStorage.setItem(`learning-quiz-${chatId}`, JSON.stringify(normalized))
            } catch (e) {
              console.warn('[v0] Could not persist quiz to localStorage', e)
            }
          }
        }
      } catch (err) {
        // If updating the main messages fails, fall back to rawApiMessages
        console.warn("[v0] Could not replace assistant placeholder, falling back to rawApiMessages:", err)
        setRawApiMessages((s) => [...s, realMsg])
      }
    } catch (err) {
      console.error("[v0] Error fetching raw API response:", err)
    }
  }

  // `status` values come from the SDK; if the value isn't the expected one,
  // fall back to a simple check that treats truthy 'status' as loading when it
  // contains 'in_progress' substring, otherwise default to false.
  const isLoading = typeof status === "string" ? status.includes("in_progress") : false

  return (
    <div className={`flex-1 flex flex-col ${focusMode ? "max-w-4xl mx-auto px-8" : "max-w-3xl mx-auto px-6"}`}>
      {/* Header */}
      {!focusMode && (
        <div className="py-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-semibold text-foreground">Learning Session</h2>
            <p className="text-sm text-muted-foreground mt-1">Deep dive into any concept</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFocus}
            className="text-muted-foreground hover:text-foreground"
          >
            <Focus className="w-4 h-4 mr-2" />
            Focus Mode
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 py-8 space-y-8 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-serif font-bold text-2xl">L</span>
            </div>
            <div>
              <h3 className="text-lg font-serif font-semibold text-foreground mb-2">Start Your Learning Journey</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask me anything you'd like to learn. I'll provide layered explanations with inline guidance and
                interactive quizzes for active recall.
              </p>
            </div>
          </div>
        )}

        {/**
         * Render messages from the `useChat` hook first, then any raw API
         * fallback messages we collected. This shows the server output even
         * when the transport isn't populating `messages` as expected.
         */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {rawApiMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* If we have a generated quiz, show a CTA button to take it */}
        {generatedQuiz && generatedQuiz.length > 0 && !showQuiz && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowQuiz(true)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg"
            >
              Take the quiz
            </button>
          </div>
        )}

        {showQuiz && generatedQuiz && (
          <div className="px-6">
            <QuizCard
              key={chatId ? `quizcard-${chatId}` : 'quizcard-default'}
              quizData={{ quiz: generatedQuiz }}
              onComplete={(score: number) => {
                setShowQuiz(false)
                // Optionally show a final score message in the chat
                const scoreMsg = {
                  id: `quiz-score-${Date.now()}`,
                  role: "assistant",
                  parts: [{ type: "text", text: `You scored ${score}/${generatedQuiz.length} on the quiz.` }],
                }
                try {
                  setMessages((prev: any[]) => [...prev, scoreMsg])
                } catch (err) {
                  setRawApiMessages((s) => [...s, scoreMsg])
                }
              }}
            />
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-primary/20 px-8 py-6 rounded-2xl rounded-bl-md">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      {!focusMode && <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />}
    </div>
  )
}
