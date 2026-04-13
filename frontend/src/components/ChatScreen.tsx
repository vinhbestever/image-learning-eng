import ImageThumbnail from './ImageThumbnail'
import ProgressIndicator from './ProgressIndicator'
import MessageList from './MessageList'
import AnswerInput from './AnswerInput'
import type { Message } from '../types'

interface Props {
  sessionId: string
  step: number
  imagePreview: string
  messages: Message[]
  onAnswerSubmitted: (answer: string) => void
  submitting?: boolean
}

export default function ChatScreen({
  step, imagePreview, messages, onAnswerSubmitted, submitting
}: Props) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
        <ImageThumbnail src={imagePreview} />
        <ProgressIndicator step={step} total={5} />
      </div>
      <MessageList messages={messages} />
      <AnswerInput onSubmit={onAnswerSubmitted} disabled={submitting} />
    </div>
  )
}
