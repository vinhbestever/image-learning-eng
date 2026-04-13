import React, { useRef } from 'react'

interface Props {
  onFileSelected: (file: File) => void
  preview: string | null
}

export default function ImageDropzone({ onFileSelected, preview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) onFileSelected(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      style={{
        border: '2px dashed #aaa',
        borderRadius: 8,
        padding: 32,
        textAlign: 'center',
        cursor: 'pointer',
        minHeight: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {preview ? (
        <img src={preview} alt="Preview" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 4 }} />
      ) : (
        <p style={{ color: '#666' }}>Drag & drop an image here, or click to browse</p>
      )}
      <input
        data-testid="file-input"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  )
}
