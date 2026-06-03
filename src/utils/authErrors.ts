/** Map Supabase / network auth errors to short lowercase copy for players. */
export function toFriendlyAuthError(message: string): string {
  const lower = message.toLowerCase()

  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  ) {
    return "can't reach the server, check your connection."
  }

  if (lower.includes('invalid login credentials')) return 'wrong email or password.'
  if (lower.includes('user already registered')) return 'that email is already taken.'
  if (lower.includes('email not confirmed')) return 'confirm your email first, then log in.'
  if (lower.includes('password') && lower.includes('least')) return 'password is too short.'
  if (lower.includes('valid email')) return 'that email does not look right.'
  if (lower.includes('same password')) return 'pick a different password than before.'
  if (lower.includes('session') && lower.includes('expired')) {
    return 'that reset link expired — request a new one.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'too many tries — wait a minute and try again.'
  }

  return message.toLowerCase()
}

export function isNetworkAuthError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  )
}
