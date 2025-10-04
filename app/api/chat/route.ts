import { GoogleGenerativeAI } from "@google/generative-ai"
import { getGeminiApiKey } from "@/lib/gemini"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log("[v0] Received request body:", JSON.stringify({ messageCount: messages.length }))

    // Compose the prompt from the system prompt and user messages
const systemPrompt = `
You are an AI learning assistant. Your goal is to help students **deeply understand concepts**.

**Style & Tone:**  
- **Short sentences** (quick hits, easy to read)  
- **Simple words**  
- **Parentheses for clarifications**—short and crisp (like: analogy, warning, or key detail)  
- Use **Markdown formatting**:  
  - **Bold** key terms  
  - *Italics* for emphasis  
  - ~~Strikethrough~~ for contrast  
  - > Blockquotes for highlights or insights  
- Be **curious, playful, clear, precise, imaginative, thoughtful, rigorous, and empathetic**  

**Response Structure:**  

**Definition:**  
[A concise, formal definition]

**Explanation:**  
[A detailed explanation with inline enrichments:  
- Parentheses for clarifications (think like this: analogy)  
- Parentheses for key details (clarify: specific detail)  
- Parentheses for warnings (important: key point to remember)  
- Bold key terms, *italics* for emphasis]

**Misconception:**  
[Common misconception explained]

**Key Takeaways:**  
• [Key point 1]  
• [Key point 2]  
• [Key point 3]  

**Quizzes:**  
Generate **3 multiple-choice questions**:

{
  "quizzes": [
    {
      "question": "[Question text]",
      "options": {
        "A": "[Option A]",
        "B": "[Option B]",
        "C": "[Option C]",
        "D": "[Option D]"
      },
      "correctAnswer": "[Letter]",
      "explanation": "[Why this is correct]"
    },
    {
      "question": "[Question text]",
      "options": {
        "A": "[Option A]",
        "B": "[Option B]",
        "C": "[Option C]",
        "D": "[Option D]"
      },
      "correctAnswer": "[Letter]",
      "explanation": "[Why this is correct]"
    },
    {
      "question": "[Question text]",
      "options": {
        "A": "[Option A]",
        "B": "[Option B]",
        "C": "[Option C]",
        "D": "[Option D]"
      },
      "correctAnswer": "[Letter]",
      "explanation": "[Why this is correct]"
    }
  ]
}

Always make explanations **engaging, clear, and focused on deep understanding**, not memorization. Format **strictly in Markdown**, ready to display.
`;



    // Combine all user messages into a single prompt string
    const userPrompt = messages.map((m: any) => m.content).join("\n")

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(getGeminiApiKey())
    const modelName = "gemini-2.5-flash"
    const model = genAI.getGenerativeModel({ model: modelName })

    // Generate content. Gemini expects valid roles such as "user" or "model".
    // The Google Generative API does not accept a "system" role here; include
    // the system instructions as part of the user prompt instead.
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: combinedPrompt }] },
      ],
    })

    // The `ai` client expects a JSON event stream with parts like:
    // { type: 'text-start', id }
    // { type: 'text-delta', id, delta }
    // { type: 'text-end', id }
    // and a final `[DONE]` sentinel on its own line.
    // We'll proxy Gemini's streaming response (if available) into that format.

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // If the provider returned a streaming body, pipe it.
          // Some SDK responses expose a streaming body; use a safe any cast to check.
          const maybeResponse: any = result.response
          if (maybeResponse && maybeResponse.body) {
            const reader = maybeResponse.body.getReader()
            const decoder = new TextDecoder()

            // Emit text-start with an id so the client can correlate the stream
            const messageId = Date.now().toString()
            controller.enqueue(encoder.encode(JSON.stringify({ type: "text-start", id: messageId }) + "\n"))

            let done = false
            let buffer = ""
            while (!done) {
              const { value, done: rDone } = await reader.read()
              done = rDone
              if (value) {
                buffer += decoder.decode(value, { stream: true })

                // Gemini might send chunks of text. Emit them as text-delta events.
                // We try to flush newline-delimited chunks if present, otherwise send the buffer.
                const parts = buffer.split(/\n+/)
                for (let i = 0; i < parts.length - 1; i++) {
                  const chunk = parts[i]
                  if (chunk.trim()) {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: "text-delta", id: messageId, delta: chunk }) + "\n"))
                  }
                }
                buffer = parts[parts.length - 1]
              }
            }

            // Flush remaining buffered text
            if (buffer && buffer.trim()) {
              controller.enqueue(encoder.encode(JSON.stringify({ type: "text-delta", id: messageId, delta: buffer }) + "\n"))
            }

            // Emit text-end
            controller.enqueue(encoder.encode(JSON.stringify({ type: "text-end", id: messageId }) + "\n"))
            // Signal end-of-stream for the ai SDK
            controller.enqueue(encoder.encode("[DONE]\n"))
            controller.close()
            return
          }

          // Fallback: if provider didn't return a stream, await full text and send as a single event
          const text = await result.response.text()
          const messageId = Date.now().toString()
          controller.enqueue(encoder.encode(JSON.stringify({ type: "text-start", id: messageId }) + "\n"))
          controller.enqueue(encoder.encode(JSON.stringify({ type: "text-delta", id: messageId, delta: text }) + "\n"))
          controller.enqueue(encoder.encode(JSON.stringify({ type: "text-end", id: messageId }) + "\n"))
          controller.enqueue(encoder.encode("[DONE]\n"))
          controller.close()
        } catch (e: any) {
          // Emit an error chunk the client can surface
          try {
            controller.enqueue(encoder.encode(JSON.stringify({ type: "error", error: String(e) }) + "\n"))
            controller.enqueue(encoder.encode("[DONE]\n"))
          } catch (_) {
            // ignore
          }
          controller.error(e)
        }
      },
    })

    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    })
  } catch (error: any) {
    // Add more helpful error message for 404/model issues
    let message = String(error)
    if (message.includes('404') && message.includes('models/gemini-pro')) {
      message += '\n\nGemini model not found. Make sure your API key is enabled for Gemini and you are using the correct model name ("gemini-pro").'
    }
    console.error("[v0] API error:", error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
