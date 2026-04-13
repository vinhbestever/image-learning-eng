export interface SessionResponse {
  session_id: string
  step: number
  total: number
  question?: string
  evaluation?: string
  done: boolean
}

export interface Message {
  role: 'agent' | 'user'
  text: string
}

export type AppState =
  | { screen: 'upload' }
  | {
      screen: 'chat'
      sessionId: string
      step: number
      messages: Message[]
      currentQuestion: string
      imagePreview: string
    }
  | { screen: 'evaluation'; evaluation: string }
