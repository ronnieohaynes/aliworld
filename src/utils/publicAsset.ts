/** Public folder URL with Vite `base` (e.g. `/aliworld/Assets/...`). */
export function publicAsset(path: string): string {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : '/'
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${base}${normalized}`
}
