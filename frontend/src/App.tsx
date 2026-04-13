import { useReducer, useRef, useState } from 'react'
import UploadScreen from './components/UploadScreen'
import ChatScreen from './components/ChatScreen'
import { streamSubmitAnswer } from './api'
import type { AppState, Message, SessionResponse } from './types'

type Action =
  | { type: 'SESSION_CREATED'; session: SessionResponse; imagePreview: string; thinking: string; thinkingDuration: number }
  | { type: 'USER_ANSWER_SUBMITTED'; text: string }
  | { type: 'ANSWER_STREAM_QUESTION'; step: number; total: number | null; question: string; thinking: string; thinkingDuration: number }
  | { type: 'ANSWER_STREAM_DONE'; evaluation: string; thinking: string; thinkingDuration: number }
  | { type: 'RETRY' }

function makeAgentMessage(text: string, thinking: string, thinkingDuration: number): Message {
  return {
    role: 'agent',
    text,
    thinking: thinking || undefined,
    thinkingDuration: thinking ? thinkingDuration : undefined,
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SESSION_CREATED':
      return {
        screen: 'chat',
        sessionId: action.session.session_id,
        step: action.session.step,
        total: action.session.total ?? null,
        messages: [makeAgentMessage(action.session.question!, action.thinking, action.thinkingDuration)],
        currentQuestion: action.session.question!,
        imagePreview: action.imagePreview,
      }
    case 'USER_ANSWER_SUBMITTED': {
      if (state.screen !== 'chat') return state
      return { ...state, messages: [...state.messages, { role: 'user', text: action.text }] }
    }
    case 'ANSWER_STREAM_QUESTION': {
      if (state.screen !== 'chat') return state
      return {
        ...state,
        step: action.step,
        total: action.total ?? null,
        messages: [...state.messages, makeAgentMessage(action.question, action.thinking, action.thinkingDuration)],
        currentQuestion: action.question,
      }
    }
    case 'ANSWER_STREAM_DONE': {
      if (state.screen !== 'chat') return state
      return {
        ...state,
        done: true,
        messages: [
          ...state.messages,
          {
            role: 'evaluation',
            text: action.evaluation,
            thinking: action.thinking || undefined,
            thinkingDuration: action.thinking ? action.thinkingDuration : undefined,
          },
        ],
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
  const [answerSubmitting, setAnswerSubmitting] = useState(false)
  const [answerError, setAnswerError] = useState<string | null>(null)

  // Live thinking stream (between user submit and agent reply)
  const [thinkingText, setThinkingText] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingDuration, setThinkingDuration] = useState(0)
  const thinkingAccRef = useRef('')
  const thinkingStartRef = useRef(0)

  const handleSessionCreated = (
    session: SessionResponse,
    imagePreviewUrl: string,
    thinking: string,
    thinkingDuration: number,
  ) => {
    setAnswerError(null)
    setThinkingText('')
    setIsThinking(false)
    setThinkingDuration(0)
    thinkingAccRef.current = ''
    dispatch({ type: 'SESSION_CREATED', session, imagePreview: imagePreviewUrl, thinking, thinkingDuration })
  }

  const handleAnswer = async (answer: string) => {
    if (state.screen !== 'chat') return
    dispatch({ type: 'USER_ANSWER_SUBMITTED', text: answer })
    setAnswerSubmitting(true)
    setAnswerError(null)
    thinkingAccRef.current = ''
    setThinkingText('')
    setIsThinking(true)
    setThinkingDuration(0)
    thinkingStartRef.current = Date.now()

    try {
      await streamSubmitAnswer(state.sessionId, answer, {
        onDelta: (t) => {
          thinkingAccRef.current += t
          setThinkingText(thinkingAccRef.current)
        },
        onQuestion: ({ step, total, text }) => {
          const elapsed = Math.max(1, Math.round((Date.now() - thinkingStartRef.current) / 1000))
          const captured = thinkingAccRef.current
          thinkingAccRef.current = ''
          setThinkingText('')
          setIsThinking(false)
          setThinkingDuration(elapsed)
          dispatch({ type: 'ANSWER_STREAM_QUESTION', step, total, question: text, thinking: captured, thinkingDuration: elapsed })
        },
        onDone: ({ evaluation }) => {
          const elapsed = Math.max(1, Math.round((Date.now() - thinkingStartRef.current) / 1000))
          const captured = thinkingAccRef.current
          thinkingAccRef.current = ''
          setThinkingText('')
          setIsThinking(false)
          setThinkingDuration(elapsed)
          if (state.screen === 'chat') URL.revokeObjectURL(state.imagePreview)
          dispatch({ type: 'ANSWER_STREAM_DONE', evaluation, thinking: captured, thinkingDuration: elapsed })
        },
        onError: (msg) => {
          thinkingAccRef.current = ''
          setThinkingText('')
          setIsThinking(false)
          setAnswerError(msg)
        },
      })
    } catch (e) {
      thinkingAccRef.current = ''
      setThinkingText('')
      setIsThinking(false)
      setAnswerError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setAnswerSubmitting(false)
    }
  }

  if (state.screen === 'upload') {
    return <UploadScreen onSessionCreated={handleSessionCreated} />
  }

  return (
    <ChatScreen
      sessionId={state.sessionId}
      step={state.step}
      total={state.total}
      imagePreview={state.imagePreview}
      messages={state.messages}
      onAnswerSubmitted={handleAnswer}
      submitting={answerSubmitting}
      submitError={answerError}
      thinkingText={thinkingText}
      isThinking={isThinking}
      thinkingDuration={thinkingDuration}
      done={state.done}
      onRetry={() => {
        dispatch({ type: 'RETRY' })
        thinkingAccRef.current = ''
        setThinkingText('')
        setIsThinking(false)
      }}
    />
  )
}
