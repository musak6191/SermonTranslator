'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { apiBaseUrl, authFetch } from '../../utils/auth'
import { Session, Translation } from '../../types'

const getSessionSegments = (translations: Translation[]) => {
  const originals = translations
    .map((translation) => translation.originalText?.trim())
    .filter((text): text is string => Boolean(text))
    .reduce((unique: string[], text) => {
      if (unique.length === 0 || unique[unique.length - 1] !== text) {
        unique.push(text)
      }
      return unique
    }, [])

  return originals.slice(Math.max(0, originals.length - 4))
}

export default function ActiveSessionPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [segments, setSegments] = useState<string[]>([])
  const [sessionTime, setSessionTime] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [listeningError, setListeningError] = useState<string | null>(null)
  const [isEnding, setIsEnding] = useState(false)
  
  const socketRef = useRef<Socket | null>(null)
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isStoppingRef = useRef(false)

  // Fetch active session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Just fetch all sessions for simplicity, filter the active one for this user
        const meRes = await authFetch('/api/auth/me')
        if (!meRes.ok) throw new Error('Not auth')
        const meData = await meRes.json()

        const res = await authFetch('/api/sessions')
        if (res.ok) {
          const sessions = await res.json()
          const active = sessions.find((s: Session) => s.imamId === meData.user.id && s.isActive)
          if (active) {
            setSession(active)
            if (active.translations?.length) {
              setSegments(getSessionSegments(active.translations))
            }
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchSession()
  }, [])

  // Initialize Socket and Speech Recognition
  useEffect(() => {
    if (!session?.id) return

    setIsListening(false)
    setListeningError(null)

    socketRef.current = io(apiBaseUrl)
    socketRef.current.emit('startSession', { sessionId: session.id })

    if (session.createdAt) {
      const startTimestamp = new Date(session.createdAt).getTime()
      setSessionTime(Math.floor((Date.now() - startTimestamp) / 1000))

      timerRef.current = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - startTimestamp) / 1000))
      }, 1000)
    }

    const SpeechRecognition =
      (window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setListeningError('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'tr-TR'

    recognitionRef.current.onstart = () => {
      setIsListening(true)
      setListeningError(null)
    }

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        }
      }

      finalTranscript = finalTranscript.trim()
      if (!finalTranscript) return

      socketRef.current?.emit('speech', { sessionId: session.id, text: finalTranscript })

      setSegments((prev: string[]) => {
        const updated = [...prev, finalTranscript]
        return updated.length > 4 ? updated.slice(updated.length - 4) : updated
      })
    }

    recognitionRef.current.onerror = (event: any) => {
      const error = event?.error
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setListeningError('Microphone access was blocked. Please allow microphone access and refresh the page.')
      } else if (error !== 'aborted') {
        setListeningError('Speech recognition stopped unexpectedly. Please try again.')
      }
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
      if (isStoppingRef.current) {
        isStoppingRef.current = false
        return
      }

      if (socketRef.current) {
        try {
          recognitionRef.current?.start()
        } catch (error) {
          console.error('Failed to restart speech recognition', error)
        }
      }
    }

    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error('Failed to start speech recognition', error)
      setListeningError('Could not start microphone listening. Please refresh the page and try again.')
    }

    return () => {
      isStoppingRef.current = true
      socketRef.current?.disconnect()
      socketRef.current = null
      recognitionRef.current?.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [session?.id])

  const handleEndSession = async () => {
    if (!session?.id || isEnding) return
    setIsEnding(true)

    try {
      const res = await authFetch(`/api/sessions/${session.id}/end`, {
        method: 'POST'
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('Failed to end session:', data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Failed to end session:', error)
    }

    // Stop local resources
    isStoppingRef.current = true
    recognitionRef.current?.stop()
    setIsListening(false)
    if (timerRef.current) clearInterval(timerRef.current)

    // Delay disconnect and redirect so cleanup can complete
    setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      router.push('/imam')
    }, 300)
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F8F5] px-8 py-8 relative">
      {/* Top Logo */}
      <div className="absolute top-8 left-0 right-0 flex justify-center pointer-events-none">
        <h1 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#288C49]">
          Zermon
        </h1>
      </div>

      {/* Header Container */}
      <div className="mx-auto w-full max-w-4xl pt-20 mb-12">
        {/* Back Button */}
        <button
          onClick={() => router.push('/imam')}
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
            {session ? session.title : 'Loading...'}
          </div>
          <div className="w-1/3 text-center">
            Speak to translate
          </div>
          <div className="w-1/3 text-right flex items-center justify-end gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
            {formatTime(sessionTime)}
          </div>
        </div>
      </div>

      {/* Main Transcript Content */}
      <div className="mx-auto flex flex-1 w-full max-w-4xl flex-col justify-end pb-24 relative overflow-hidden">
        <div className="flex flex-col gap-6 w-full font-serif text-[#144f2d]">
          {segments.length === 0 && (
            <p className="text-4xl sm:text-5xl font-bold text-[#144f2d]/30 text-center animate-pulse">
              Waiting for speech...
            </p>
          )}

          {/* Level 4 (Oldest) */}
          {segments.length >= 4 && (
            <p className="text-sm font-medium leading-relaxed opacity-40 transition-all duration-500">
              {segments[segments.length - 4]}
            </p>
          )}

          {/* Level 3 */}
          {segments.length >= 3 && (
            <p className="text-xl font-medium leading-relaxed opacity-60 transition-all duration-500">
              {segments[segments.length - 3]}
            </p>
          )}

          {/* Level 2 */}
          {segments.length >= 2 && (
            <p className="text-3xl font-semibold leading-tight opacity-80 transition-all duration-500">
              {segments[segments.length - 2]}
            </p>
          )}

          {/* Level 1 (Current) */}
          {segments.length >= 1 && (
            <p className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight opacity-100 transition-all duration-500">
              {segments[segments.length - 1]}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto mb-8 flex w-full max-w-4xl items-center justify-between rounded-xl border border-[#288C49]/20 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${isListening ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm font-semibold text-[#144f2d]">
            {isListening ? 'Listening for sermon speech' : 'Microphone ready'}
          </span>
        </div>
        {listeningError ? (
          <span className="text-sm text-red-600">{listeningError}</span>
        ) : (
          <span className="text-sm text-[#288C49]">Live speech-to-text is active</span>
        )}
      </div>

      {/* End Session Button */}
      <div className="flex justify-center pb-8 mt-auto">
        <button
          onClick={handleEndSession}
          disabled={isEnding}
          className="rounded-lg bg-[#b91c1c] px-14 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-[#991b1b] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEnding ? 'Ending…' : 'End Session'}
        </button>
      </div>
    </div>
  )
}
