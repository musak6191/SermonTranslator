'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { authFetch } from './utils/auth'

export default function Page() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authFetch('/api/auth/me', {}, false)

        if (response.ok) {
          const data = await response.json()
          if (data.user.role === 'imam') {
            router.push('/imam')
            return
          }
          if (data.user.role === 'listener') {
            router.push('/listener')
            return
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-brand border-t-transparent mx-auto" />
          <p className="mt-4 text-textMuted">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-20">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex rounded-full border border-[#dbeade] bg-white/80 px-4 py-1 text-sm font-semibold uppercase tracking-[0.3em] text-brandDark/75">
              Zermon
            </div>

            <div className="space-y-5">
              <h1 className="font-serif text-4xl font-black tracking-[-0.04em] text-brandDark sm:text-5xl lg:text-6xl">
                Above the language barrier. Where wisdom and knowledge lies.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-textMuted sm:text-lg">
                Experience live Turkish sermons in German or English with real-time, high-fidelity translation. Bridging faith and understanding for a global community.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button onClick={() => router.push('/login')} className="sm:w-auto">
                Be part of it
              </Button>
              <Button variant="secondary" onClick={() => router.push('/login')} className="sm:w-auto">
                Sign in
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden bg-surface">
            <div className="rounded-[1.75rem] border border-[#dbeade] bg-white/95 p-8 shadow-[0_24px_80px_rgba(17,45,22,0.08)]">
              <span className="inline-flex items-center rounded-full bg-[#eef7ec] px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-brandDark/80">
                LIVE FROM ISTANBUL
              </span>
              <div className="grid gap-8 md:grid-cols-2 mt-6">
                <div className="space-y-3">
                  <p className="text-[0.78rem] font-semibold uppercase tracking-[0.26em] text-textMuted">Original (TR)</p>
                  <p className="text-base font-medium leading-7 text-brandDark">
                    “İman, kalbin tasdiki ve dilin ikrarıdır..."
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-[0.78rem] font-semibold uppercase tracking-[0.26em] text-textMuted">Translated (EN)</p>
                  <p className="text-base font-medium leading-7 text-brandDark">
                    “Faith is the heart’s affirmation and the tongue’s testimony..."
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef7ec] text-brandDark">
              <span className="text-xl">🕌</span>
            </div>
            <div className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold text-brandDark">For Imams</h2>
              <p className="text-textMuted">
                Host live sessions with ease. Reach a wider, diverse audience without language barriers using our high-fidelity streaming tools.
              </p>
            </div>
          </Card>

          <Card className="space-y-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef7ec] text-brandDark">
              <span className="text-xl">🎧</span>
            </div>
            <div className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold text-brandDark">For Listeners</h2>
              <p className="text-textMuted">
                Join real-time translations seamlessly. Listen to audio or read text in your preferred language, synchronized perfectly with the live speaker.
              </p>
            </div>
          </Card>
        </section>

        <section className="space-y-10">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brandDark/70">Every Detail, Handcrafted for Faith</p>
            <p className="text-2xl font-semibold text-brandDark sm:text-3xl">
              Modern technology meeting spiritual tradition in a distraction-free environment.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card className="space-y-6">
              <h3 className="font-serif text-3xl font-bold text-brandDark">Real-Time AI Translation</h3>
              <p className="text-textMuted leading-8">
                Proprietary AI models trained on religious texts ensure theological accuracy and cultural sensitivity in every sentence.
              </p>
            </Card>
            <Card className="space-y-4 bg-[#eef7ec] border-[#dbeade]">
              <h3 className="font-serif text-3xl font-bold text-brandDark">Sacred Minimalism</h3>
              <p className="text-textMuted leading-7">
                A distraction-free UI designed to let you focus solely on the message and your spiritual growth.
              </p>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="space-y-4 border-[#dbeade] bg-white/95">
              <h4 className="font-serif text-2xl font-semibold text-brandDark">Past Sermon Archive</h4>
              <p className="text-textMuted leading-7">
                Access a library of translated sermons. Revisit teachings anytime, anywhere, with saved notes and bookmarks.
              </p>
            </Card>
            <Card className="space-y-4 border-[#dbeade] bg-white/95">
              <h4 className="font-serif text-2xl font-semibold text-brandDark">Community Discussion</h4>
              <p className="text-textMuted leading-7">
                Connect with others globally. Discuss sermons, share insights, and build a borderless spiritual community.
              </p>
            </Card>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#dbeade] bg-white/95 p-10 shadow-[0_24px_80px_rgba(17,45,22,0.08)]">
          <div className="flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
            <div className="max-w-2xl">
              <h2 className="font-serif text-3xl font-bold text-brandDark sm:text-4xl">
                Join the Zermon community today.
              </h2>
              <p className="mt-4 text-textMuted leading-7">
                Start your journey towards a deeper, more inclusive spiritual experience. No credit card required.
              </p>
            </div>
            <Button onClick={() => router.push('/login')} className="w-full max-w-sm sm:w-auto">
              Be part of it
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
