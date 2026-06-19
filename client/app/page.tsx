'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from './utils/auth'

export default function Page() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Pass handle401=false so authFetch does NOT do a hard window.location redirect
        // on 401 — we handle the redirect ourselves via router.push below.
        const response = await authFetch('/api/auth/me', {}, false)

        if (response.ok) {
          const data = await response.json()
          // Redirect based on user role
          if (data.user.role === 'imam') {
            router.push('/imam')
          } else if (data.user.role === 'listener') {
            router.push('/listener')
          }
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return null
}