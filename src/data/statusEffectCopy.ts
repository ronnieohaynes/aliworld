/** One-line tooltips for battle status tags. */
export const STATUS_EFFECT_HINTS: Record<string, string> = {
  bleed: 'enemy loses hp each turn.',
  shake: 'enemy hits weaker.',
  slow: 'you go first; enemy hits softer.',
  stun: 'enemy skips their turn.',
  miss: 'enemy whiffs their turn.',
  brace: 'you take less damage.',
  double: 'your next hit lands twice.',
  reflect: 'some damage bounces back.',
}

export const STATUS_EFFECT_LEGEND =
  'bleed · chip each turn · shake/slow · weaker hits · stun · skip turn · brace · take less'
