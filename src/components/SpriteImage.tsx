type Props = {
  src: string
  alt: string
  className?: string
}

export function SpriteImage({ src, alt, className }: Props) {
  return (
    <img
      className={`sprite-img ${className ?? ''}`}
      src={src}
      alt={alt}
      decoding="async"
      loading="lazy"
      draggable={false}
    />
  )
}
