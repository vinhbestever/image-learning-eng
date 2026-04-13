import React, { useState } from 'react'
import ImageDropzone from './ImageDropzone'
import { createSession } from '../api'
import type { SessionResponse } from '../types'

interface Props {
  onSessionCreated: (session: SessionResponse, image: File) => void
}

export default function UploadScreen({ onSessionCreated }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelected = (selected: File) => {
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setError(null)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const session = await createSession(file)
      onSessionCreated(session, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Learn English with Images</h1>
      <ImageDropzone onFileSelected={handleFileSelected} preview={preview} />
      {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '12px 0',
          fontSize: 16,
          cursor: file && !loading ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? 'Analyzing image...' : 'Start Session'}
      </button>
    </div>
  )
}
