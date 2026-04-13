interface Props {
  src: string
}

export default function ImageThumbnail({ src }: Props) {
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 14,
        overflow: 'hidden',
        flexShrink: 0,
        border: '3px solid var(--paper)',
        boxShadow: '0 8px 28px rgba(20, 18, 16, 0.2)',
        transform: 'rotate(-3deg)',
      }}
    >
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  )
}
