/** Merge same-size ASCII grids; later layers paint over '.' */
export function mergeGrids(layers: readonly (readonly string[])[]): string[] {
  if (layers.length === 0) return []
  const rows = layers[0].length
  const cols = Math.max(...layers[0].map((r) => r.length))
  const out: string[] = []

  for (let y = 0; y < rows; y++) {
    let row = ''
    for (let x = 0; x < cols; x++) {
      let ch = '.'
      for (const layer of layers) {
        const line = layer[y] ?? ''
        const c = line[x] ?? '.'
        if (c !== '.') ch = c
      }
      row += ch
    }
    out.push(row)
  }
  return out
}
