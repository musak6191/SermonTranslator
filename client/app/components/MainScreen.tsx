'use client'

import { useRouter } from 'next/navigation'

export default function MainScreen() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-surface flex items-center justify-start p-16">
      <div className="max-w-md w-full ml-20">
        <h1 className="text-4xl font-serif mb-16 text-primary">Sermon Translator</h1>
        <p className="mb-8 text-on-surface-variant">Choose your role to begin</p>
        <div className="space-y-6">
          <button
            onClick={() => router.push('/imam')}
            className="w-full bg-primary hover:bg-primary-container text-on-primary font-sans py-4 px-8 rounded-xl text-xl shadow-sm transition-colors"
          >
            Translate as an Imam
          </button>
          <button
            onClick={() => router.push('/listener')}
            className="w-full bg-secondary hover:bg-secondary-container text-on-secondary font-sans py-4 px-8 rounded-xl text-xl shadow-sm transition-colors"
          >
            Participate as a Listener
          </button>
        </div>
      </div>
    </div>
  )
}