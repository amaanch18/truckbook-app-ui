import { useEffect, useState } from 'react'
import { subscribeApiLoading } from '../../api/http.js'

export default function GlobalApiLoader() {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    return subscribeApiLoading((nextLoading) => {
      setIsLoading(nextLoading)
    })
  }, [])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/25 backdrop-blur-[1px]">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span className="text-sm font-medium text-slate-700">Please wait...</span>
      </div>
    </div>
  )
}
