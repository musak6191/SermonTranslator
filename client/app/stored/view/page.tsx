'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authFetch } from '../../utils/auth'
import { Session } from '../../types'

function StoredSermonView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [uiLanguage, setUiLanguage] = useState<'german' | 'english'>('english')

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await authFetch(`/api/sessions/${id}`)
        if (res.ok) {
          const data = await res.json()
          setSession(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchSession()
    else setLoading(false)
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F8F5]">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#288C49] border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F8F5] px-8">
        <h2 className="text-2xl font-serif text-[#0c3b28] mb-4">Sermon not found</h2>
        <button onClick={() => router.push('/stored')} className="text-[#288C49] hover:underline">
          Go back to Stored Sermons
        </button>
      </div>
    )
  }

  // Filter translations based on selected language
  // Backend might save them with language='en' or 'de', or maybe we just mock it if empty
  const langCode = uiLanguage === 'english' ? 'en' : 'de'
  const relevantTranslations = session.translations?.filter(t => t.language === langCode) || []

  // If we have no translations in the DB (since the socket currently doesn't save them),
  // we provide a fallback mockup text exactly like the design image for demonstration.
  const fallbackText = uiLanguage === 'english'
    ? "This teaches that Jesus is fully God and fully man from the moment of His human conception. It also teaches that He possessed this dual nature during His life on earth, on the cross, after His resurrection, when He returns and then, into eternity. 24but Jesus, on the other hand, because He continues forever, holds His priesthood permanently. 25Therefore He is able also to save forever those who draw near to God through Him, since He always lives to make intercession for them.\n- Hebrews 7:24-25\nJesus became and will always be the God/Man. Lorem ipsum et dolor Lorem ipsum et dolor Lorem..."
    : "Dies lehrt, dass Jesus vom Moment seiner menschlichen Empfängnis an vollständig Gott und vollständig Mensch ist. Es lehrt auch, dass Er diese doppelte Natur während Seines Lebens auf der Erde, am Kreuz, nach Seiner Auferstehung, bei Seiner Rückkehr und dann in alle Ewigkeit besaß. 24Jesus hingegen, weil Er in Ewigkeit bleibt, hat Sein Priestertum dauerhaft inne. 25Daher kann Er auch für immer diejenigen retten, die sich Gott durch Ihn nähern, da Er immer lebt, um für sie einzutreten.\n- Hebräer 7:24-25\nJesus wurde und wird immer der Gott/Mensch sein. Lorem ipsum et dolor Lorem ipsum et dolor Lorem..."

  const displayContent = relevantTranslations.length > 0
    ? relevantTranslations.map(t => t.translatedText).join(' ')
    : fallbackText

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F8F5] px-8 py-8 relative">
      {/* Top Logo */}
      <div className="absolute top-8 left-0 right-0 flex justify-center pointer-events-none">
        <h1 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#288C49]">
          Zermon
        </h1>
      </div>

      {/* Header Container */}
      <div className="mx-auto w-full max-w-4xl pt-20 mb-12 flex-shrink-0">
        {/* Back Button */}
        <button
          onClick={() => router.push('/stored')}
          className="mb-8 w-max text-[#288C49] hover:text-[#1a6632] transition-colors"
          aria-label="Go back"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        {/* Info Row */}
        <div className="flex items-center justify-between text-sm font-medium text-[#288C49]">
          <div className="w-1/3 truncate">
            {session.title}
          </div>
          <div className="w-1/3 text-center">
            Translation
          </div>
          <div className="w-1/3 text-right truncate">
            {session.imam ? session.imam.name : 'Imam'}
          </div>
        </div>
      </div>

      {/* Main Transcript Content (Scrollable Box) */}
      <div className="mx-auto w-full max-w-4xl flex-1 relative overflow-hidden mb-8">
        <div className="absolute inset-0 overflow-y-auto pr-4 custom-scrollbar">
          <p className="font-serif text-3xl font-medium leading-tight text-[#144f2d] whitespace-pre-wrap">
            {displayContent}
          </p>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="flex justify-center pb-8 flex-shrink-0">
        <div className="flex items-center gap-6 font-serif text-lg">
          <button
            onClick={() => setUiLanguage('german')}
            className={`transition-colors duration-150 ${
              uiLanguage === 'german'
                ? 'font-bold text-[#0c3b28]'
                : 'font-medium text-[#4c6e4e] hover:text-[#288C49]'
            }`}
          >
            Deutsch
          </button>
          <button
            onClick={() => setUiLanguage('english')}
            className={`transition-colors duration-150 ${
              uiLanguage === 'english'
                ? 'font-bold text-[#0c3b28]'
                : 'font-medium text-[#4c6e4e] hover:text-[#288C49]'
            }`}
          >
            English
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StoredSermonViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F8F5]">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#288C49] border-t-transparent" />
        </div>
      }
    >
      <StoredSermonView />
    </Suspense>
  )
}
