import './PatchSkillPicker.css'
import type { SkillId } from '../store/skillStore'

type Props = {
  xpAmount: number
  skills: ReadonlyArray<{ id: SkillId; label: string }>
  onPick: (skill: SkillId) => void
}

export function PatchSkillPicker({ xpAmount, skills, onPick }: Props) {
  return (
    <div className="patch-picker" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
      <p className="patch-picker__name">b.stax</p>
      <p className="patch-picker__text">
        pick a skill for this patch — it's worth {xpAmount} xp.
      </p>
      <div className="patch-picker__options">
        {skills.map((skill) => (
          <button
            key={skill.id}
            type="button"
            className="patch-picker__btn"
            onClick={() => onPick(skill.id)}
          >
            {skill.label}
          </button>
        ))}
      </div>
    </div>
  )
}
