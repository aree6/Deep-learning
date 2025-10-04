// Utility to get Gemini API key from environment
export function getGeminiApiKey() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables')
  }
  return process.env.GEMINI_API_KEY
}
