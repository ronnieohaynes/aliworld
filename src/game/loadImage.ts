import { retryAsync } from '../utils/retryAsync'

export async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.decoding = 'async'
  img.src = src

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
  })

  if (typeof img.decode === 'function') {
    try {
      await img.decode()
    } catch {
      /* decode can reject on broken images; onload still fired */
    }
  }

  return img
}

export function loadImageWithRetry(
  src: string,
  delaysMs: number[] = [300, 800],
): Promise<HTMLImageElement> {
  return retryAsync(() => loadImage(src), delaysMs)
}
