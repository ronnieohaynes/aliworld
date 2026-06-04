import { trackShareAction } from './analytics'

const CARD_FILENAME = 'aliworld-card.png'

export function downloadIdentityCardPng(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = CARD_FILENAME
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function shareIdentityCardPng(blob: Blob): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], CARD_FILENAME, { type: 'image/png' })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'ALIWORLD' })
    trackShareAction('identity_card')
    return 'shared'
  }
  downloadIdentityCardPng(blob)
  trackShareAction('identity_card')
  return 'downloaded'
}
