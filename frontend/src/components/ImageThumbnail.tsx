interface Props { src: string }

export default function ImageThumbnail({ src }: Props) {
  return (
    <img
      src={src}
      alt="Session image"
      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6 }}
    />
  )
}
