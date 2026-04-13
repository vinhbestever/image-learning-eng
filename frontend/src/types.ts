export interface SessionResponse {
  session_id: string
  step: number
  total: number | null
  question?: string
  evaluation?: string
  done: boolean
}

export interface Message {
  role: 'agent' | 'user' | 'evaluation'
  text: string
  thinking?: string
  thinkingDuration?: number
}

export type AppState =
  | { screen: 'upload' }
  | {
      screen: 'chat'
      sessionId: string
      step: number
      total: number | null
      messages: Message[]
      currentQuestion: string
      imagePreview: string
      done?: boolean
    }
