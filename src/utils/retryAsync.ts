function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** Run fn up to delays.length + 1 times; wait between failures (default 300ms, 800ms). */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  delaysMs: number[] = [300, 800],
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt >= delaysMs.length) break
      await sleep(delaysMs[attempt]!)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
