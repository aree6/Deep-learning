"use client"

import { Button } from "@/components/ui/button"
import { BookOpen, Brain, Target } from "lucide-react"

interface LandingScreenProps {
  onStartLearning: () => void
}

export function LandingScreen({ onStartLearning }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center space-y-12">
        {/* Header */}
        <div className="space-y-6">
          <h1 className="text-5xl font-serif font-bold text-primary mb-4">LearnDeep</h1>
          <p className="text-xl text-foreground leading-relaxed">
            An AI-powered education companion that teaches through{" "}
            <span className="text-primary font-medium">layered explanations</span> and reinforces learning with{" "}
            <span className="text-primary font-medium">interactive quizzes</span> for deeper retention.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 my-16">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-serif font-semibold">Structured Learning</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Receive explanations with inline guidance, clarifications, and contextual insights
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-serif font-semibold">Active Recall</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Interactive quizzes after each explanation to reinforce understanding
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-serif font-semibold">Deep Retention</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Socratic dialogue approach that encourages conceptual connections
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Button
            onClick={onStartLearning}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3 text-lg"
          >
            Start Learning
          </Button>
          <p className="text-sm text-muted-foreground">Experience learning that sticks</p>
        </div>
      </div>
    </div>
  )
}
