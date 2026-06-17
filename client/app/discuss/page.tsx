'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../components/dashboard/AppShell'
import { authFetch, getCachedUser, setCachedUser } from '../utils/auth'
import { User, ForumPost } from '../types'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '.')
}

export default function DiscussPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [forums, setForums] = useState<ForumPost[]>([])
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        // Try to use cached user first for faster render
        const cached = getCachedUser()
        if (cached) {
          setUser(cached)
          setLoading(false)
        }

        const authRes = await authFetch('/api/auth/me')
        if (!authRes.ok) throw new Error('Not authorized')
        const authData = await authRes.json()
        setUser(authData.user)
        setCachedUser(authData.user)

        const forumRes = await authFetch('/api/forums')
        if (forumRes.ok) {
          const data = await forumRes.json()
          setForums(data)
        }
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  // Poll for new forum posts every 15 seconds (replaced SSE push)
  useEffect(() => {
    const interval = setInterval(() => {
      authFetch('/api/forums')
        .then(r => r.json())
        .then(setForums)
        .catch(console.error)
    }, 15_000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F8F5]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#288C49] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <AppShell user={user}>
      <div className="flex flex-col pt-12 pb-16 px-8 w-full max-w-4xl mx-auto">
        
        {/* Header Row */}
        <div className="mb-8 text-center flex flex-col items-center">
          <h1 className="font-serif text-4xl font-bold tracking-[-0.03em] text-[#0c3b28]">
            Forum
          </h1>
          <p className="mt-2 text-base text-[#4c6e4e]">
            Discuss questions and answers with your community.
          </p>
          <div className="mt-4">
            <button
              onClick={() => router.push('/discuss/new')}
              className="bg-[#288C49] text-white px-12 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-[#1a6632] transition-colors"
            >
              Post
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 flex flex-col gap-4">
          {forums.length === 0 ? (
            <p className="text-[#4c6e4e] font-medium text-lg">No forum posts available.</p>
          ) : (
            forums.map((forum) => {
              let snippet = forum.content || ''
              if (snippet.length > 50) {
                snippet = snippet.substring(0, 50) + '...'
              } else if (snippet.length > 0) {
                snippet = snippet + '...'
              }

              const dateStr = formatDate(forum.createdAt)

              return (
                <div
                  key={forum.id}
                  onClick={() => router.push(`/discuss/view?id=${forum.id}`)}
                  className="flex items-start justify-between px-8 py-6 cursor-pointer rounded-xl transition-colors duration-150 bg-[#eef7ec] hover:bg-[#dbeade]"
                >
                  <div>
                    <h2 className="font-serif text-3xl font-bold text-[#0c3b28] mb-1">
                      {forum.title}
                    </h2>
                    <p className="text-[#4c6e4e] font-sans text-sm">
                      {snippet || 'Beginning of the Question/Forum Text ...'}
                    </p>
                  </div>
                  <div className="text-[#4c6e4e] font-sans text-sm pt-2">
                    {dateStr}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </AppShell>
  )
}
