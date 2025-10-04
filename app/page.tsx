"use client"

import { useState } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { LandingScreen } from "@/components/landing-screen"

export default function Home() {
  const [showChat, setShowChat] = useState(false)

  if (!showChat) {
    return <LandingScreen onStartLearning={() => setShowChat(true)} />
  }

  return <ChatInterface />
}
