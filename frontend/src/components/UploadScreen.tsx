import { useRef, useState } from 'react'
import ImageDropzone from './ImageDropzone'
import { streamCreateSession } from '../api'
import { normalizeSessionResponse } from '../sessionResponse'
import type { SessionResponse } from '../types'

interface Props {
  onSessionCreated: (
    session: SessionResponse,
    imagePreviewUrl: string,
    thinking: string,
    thinkingDuration: number,
  ) => void
}

export default function UploadScreen({ onSessionCreated }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisText, setAnalysisText] = useState('')

  const thinkingAccRef = useRef('')
  const thinkingStartRef = useRef(0)

  const handleFileSelected = (selected: File) => {
    setFile(selected)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(selected)
    })
    setError(null)
  }

  const handleSubmit = async () => {
    if (!file || !preview) return
    setLoading(true)
    setError(null)
    setAnalysisText('')
    thinkingAccRef.current = ''
    thinkingStartRef.current = Date.now()

    try {
      await streamCreateSession(file, {
        onDelta: (t) => {
          thinkingAccRef.current += t
          setAnalysisText(thinkingAccRef.current)
        },
        onQuestion: ({ sessionId, step, total, text }) => {
          const elapsed = Math.max(1, Math.round((Date.now() - thinkingStartRef.current) / 1000))
          const captured = thinkingAccRef.current
          thinkingAccRef.current = ''
          setLoading(false)
          const session: SessionResponse = normalizeSessionResponse({
            session_id: sessionId,
            step,
            total,
            question: text,
            done: false,
          })
          onSessionCreated(session, preview, captured, elapsed)
        },
        onError: (msg) => {
          setError(msg)
          setLoading(false)
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', padding: 'clamp(24px, 6vw, 64px)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <header style={{ marginBottom: '2.5rem', textAlign: 'left' }}>
          <p className="label-tag" style={{ marginBottom: 8 }}>
            English studio
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', margin: '0 0 12px' }}>
            Describe the world
            <br />
            <span style={{ color: 'var(--accent)' }}>in English</span>
          </h1>
          <p style={{ margin: 0, color: 'var(--ink-soft)', maxWidth: 420, lineHeight: 1.65 }}>
            Upload a photograph. The tutor adapts each session: vocabulary, then grammar, then building sentences
            from your picture. There is no fixed number of questions — the tutor decides when you are ready for
            feedback.
          </p>
          <p
            style={{
              margin: '12px 0 0',
              color: 'var(--ink-soft)',
              maxWidth: 420,
              lineHeight: 1.65,
              fontSize: '0.92rem',
              opacity: 0.92,
            }}
          >
            Buổi học linh hoạt: từ vựng → ngữ pháp → đặt câu. Bạn có thể hỏi giáo viên bằng tiếng Việt hoặc tiếng
            Anh khi cần; giáo viên sẽ trả lời rồi tiếp tục bài.
          </p>
        </header>

        <ImageDropzone onFileSelected={handleFileSelected} preview={preview} />

        {error ? (
          <p role="alert" style={{ color: 'var(--accent-dim)', marginTop: 16, textAlign: 'center' }}>
            {error}
          </p>
        ) : null}

        {loading && (
          <div
            style={{
              marginTop: 20,
              padding: '14px 18px',
              borderRadius: 12,
              background: 'rgba(92, 107, 86, 0.06)',
              border: '1px solid rgba(92, 107, 86, 0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: analysisText ? 8 : 0 }}>
              <span className="thinking-dots" aria-hidden>
                <span /><span /><span />
              </span>
              <span
                className="label-tag"
                style={{ color: 'var(--sage)' }}
              >
                Preparing your lesson…
              </span>
            </div>
            {analysisText && (
              <p
                style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  color: 'var(--ink-soft)',
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  maxHeight: 140,
                  overflowY: 'auto',
                }}
              >
                {analysisText}
                <span className="stream-cursor" aria-hidden />
              </p>
            )}
          </div>
        )}

        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!file || loading}
            style={{ minWidth: 220 }}
          >
            {loading ? 'Starting adaptive lesson…' : 'Begin adaptive lesson'}
          </button>
        </div>
      </div>
    </div>
  )
}
