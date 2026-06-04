import { useCallback, useState } from 'react'

export function useAdminToast() {
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 4000)
  }, [])

  return { toast, showToast }
}

type ToastProps = {
  message: string | null
}

export function AdminToast({ message }: ToastProps) {
  if (!message) return null
  return (
    <div className="admin-toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
