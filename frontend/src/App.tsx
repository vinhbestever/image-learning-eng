import { useReducer } from 'react'
import UploadScreen from './components/UploadScreen'
import ChatScreen from './components/ChatScreen'
import EvaluationScreen from './components/EvaluationScreen'
import { submitAnswer } from './api'
import type { AppState, Message, SessionResponse } from './types'

type Action =
  | { type: 'SESSION_CREATED'; session: SessionResponse; imagePreview: string }
  | { type: 'ANSWER_SUBMITTED'; response: SessionResponse; userAnswer: string }
  | { type: 'RETRY' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SESSION_CREATED':
      return {
        screen: 'chat',
        sessionId: action.session.session_id,
        step: action.session.step,
        messages: [{ role: 'agent', text: action.session.question! }],
        currentQuestion: action.session.question!,
        imagePreview: action.imagePreview,
      }
    case 'ANSWER_SUBMITTED': {
      if (state.screen !== 'chat') return state
      const newMessages: Message[] = [
        ...state.messages,
        { role: 'user', text: action.userAnswer },
      ]
      if (action.response.done) {
        return { screen: 'evaluation', evaluation: action.response.evaluation! }
      }
      return {
        ...state,
        step: action.response.step,
        messages: [...newMessages, { role: 'agent', text: action.response.question! }],
        currentQuestion: action.response.question!,
      }
    }
    case 'RETRY':
      return { screen: 'upload' }
    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { screen: 'upload' })

  const handleSessionCreated = (session: SessionResponse, image: File) => {
    const imagePreview = URL.createObjectURL(image)
    dispatch({ type: 'SESSION_CREATED', session, imagePreview })
  }

  const handleAnswer = async (answer: string) => {
    if (state.screen !== 'chat') return
    const response = await submitAnswer(state.sessionId, answer)
    dispatch({ type: 'ANSWER_SUBMITTED', response, userAnswer: answer })
  }

  if (state.screen === 'upload') {
    return <UploadScreen onSessionCreated={handleSessionCreated} />
  }
  if (state.screen === 'chat') {
    return (
      <ChatScreen
        sessionId={state.sessionId}
        step={state.step}
        imagePreview={state.imagePreview}
        messages={state.messages}
        onAnswerSubmitted={handleAnswer}
      />
    )
  }
  return <EvaluationScreen evaluation={state.evaluation} onRetry={() => dispatch({ type: 'RETRY' })} />
}
