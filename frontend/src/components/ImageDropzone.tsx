import { useRef } from 'react'

interface Props {
  onFileSelected: (file: File) => void
  preview: string | null
}

export default function ImageDropzone({ onFileSelected, preview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = (f: File | undefined) => {
    if (f && f.type.startsWith('image/')) onFileSelected(f)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onDrop={(e) => {
        e.preventDefault()
        pick(e.dataTransfer.files[0])
      }}
      className="card"
      style={{
        cursor: 'pointer',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        border: '2px dashed rgba(196, 85, 42, 0.45)',
        background: 'linear-gradient(135deg, rgba(246, 240, 232, 0.95) 0%, rgba(232, 223, 210, 0.85) 100%)',
        transform: 'rotate(-0.5deg)',
        maxWidth: 400,
        margin: '0 auto',
      }}
    >
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {preview ? (
        <img
          src={preview}
          alt="Selected"
          style={{
            maxWidth: '100%',
            maxHeight: 220,
            borderRadius: 12,
            objectFit: 'contain',
            boxShadow: '0 12px 40px rgba(20, 18, 16, 0.15)',
          }}
        />
      ) : (
        <>
          <p className="label-tag" style={{ marginBottom: 12 }}>
            Your visual prompt
          </p>
          <p style={{ margin: 0, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Drop an image here, or click to browse
          </p>
          <p style={{ margin: '12px 0 0', fontSize: '0.85rem', color: 'var(--sage)' }}>
            JPEG, PNG, or WebP · up to 5MB
          </p>
        </>
      )}
    </div>
  )
}
