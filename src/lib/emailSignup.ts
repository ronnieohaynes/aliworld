import { supabase } from './supabaseClient'

export type EmailSignupResult =
  | { status: 'success' }
  | { status: 'duplicate' }
  | { status: 'invalid' }
  | { status: 'error'; message: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return email.length >= 5 && email.length <= 254 && EMAIL_PATTERN.test(email)
}

export async function submitEmailSignup(rawEmail: string): Promise<EmailSignupResult> {
  const email = normalizeEmail(rawEmail)
  if (!isValidEmail(email)) {
    return { status: 'invalid' }
  }

  const { error } = await supabase.from('aw_email_signups').insert({ email })

  if (!error) {
    return { status: 'success' }
  }

  if (error.code === '23505') {
    return { status: 'duplicate' }
  }

  return {
    status: 'error',
    message: error.message || 'something went wrong — try again in a moment.',
  }
}
