import './DialogueBox.css'

type Props = {
  name: string
  line: string
  onAdvance: () => void
}

export function DialogueBox({ name, line, onAdvance }: Props) {
  return (
    <div className="dialogue-box" onClick={(e) => { e.stopPropagation(); onAdvance() }} role="dialog" aria-modal="true">
      {name && <p className="dialogue-box__name">{name}</p>}
      <p className="dialogue-box__text">{line}</p>
      <span className="dialogue-box__continue">tap to continue ▸</span>
    </div>
  )
}
