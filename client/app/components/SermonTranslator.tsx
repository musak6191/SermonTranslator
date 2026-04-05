'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRouter } from 'next/navigation'

export default function SermonTranslator() {
  const [transcript, setTranscript] = useState('')
  const [german, setGerman] = useState('')
  const [english, setEnglish] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [inputText, setInputText] = useState('')
  const [sessionActive, setSessionActive] = useState(false)
  const [listenerCount, setListenerCount] = useState(0)
  const [sessionTime, setSessionTime] = useState(0)
  const socketRef = useRef<Socket | null>(null)
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Connect to backend
    socketRef.current = io('http://localhost:3000')

    socketRef.current.on('translation', (data) => {
      setGerman(prev => prev + data.german)
      setEnglish(prev => prev + data.english)
    })

    socketRef.current.on('listenerCount', (count) => {
      setListenerCount(count)
    })

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'tr-TR' // Turkish

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript)
          socketRef.current?.emit('speech', { text: finalTranscript })
        }
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      socketRef.current?.disconnect()
      recognitionRef.current?.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (sessionActive) {
      timerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [sessionActive])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  const startSession = () => {
    setSessionActive(true)
    setTranscript('')
    setGerman('')
    setEnglish('')
    setSessionTime(0)
    socketRef.current?.emit('startSession')
  }

  const stopSession = () => {
    setSessionActive(false)
    setIsListening(false)
    recognitionRef.current?.stop()
    socketRef.current?.emit('endSession')
  }

  const handleTextSubmit = () => {
    if (inputText.trim()) {
      setTranscript(prev => prev + inputText + ' ')
      socketRef.current?.emit('speech', { text: inputText })
      setInputText('')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header with session stats */}
      <div className="bg-surface-container-low p-6 border-b border-outline-variant">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-serif text-primary">Imam&apos;s Hub</h1>
          <div className="flex items-center space-x-8">
            <div className="text-center">
              <div className="text-sm font-sans text-on-surface-variant">Live Transmission</div>
              <div className="flex items-center justify-center space-x-2">
                {sessionActive && <div className="w-3 h-3 bg-error rounded-full animate-pulse"></div>}
                <div className="text-2xl font-serif text-primary">{formatTime(sessionTime)}</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-sans text-on-surface-variant">Listeners</div>
              <div className="text-2xl font-serif text-primary">{listenerCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Session controls */}
        <div className="mb-8 flex justify-center">
          {!sessionActive ? (
            <button
              onClick={startSession}
              className="bg-primary hover:bg-primary-container text-on-primary font-sans py-3 px-8 rounded-xl text-lg shadow-sm"
            >
              Start Session
            </button>
          ) : (
            <div className="flex space-x-4">
              <button
                onClick={isListening ? stopListening : startListening}
                className="bg-secondary hover:bg-secondary-container text-on-secondary font-sans py-3 px-8 rounded-xl text-lg shadow-sm"
              >
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </button>
              <button
                onClick={stopSession}
                className="bg-error hover:bg-error-container text-on-error font-sans py-3 px-8 rounded-xl text-lg shadow-sm"
              >
                End Session
              </button>
            </div>
          )}
        </div>

        {/* Main content - asymmetrical layout */}
        <div className="flex gap-8">
          {/* Left side - wider */}
          <div className="flex-1 space-y-6">
            {/* Text input */}
            <div className="bg-surface-container p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-serif mb-4 text-primary">Manual Input</h2>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type Turkish text here..."
                className="w-full p-4 bg-surface border border-outline rounded-lg font-sans text-on-surface resize-none"
                rows={4}
              />
              <button
                onClick={handleTextSubmit}
                className="mt-4 bg-primary hover:bg-primary-container text-on-primary font-sans py-2 px-6 rounded-lg"
              >
                Translate Text
              </button>
            </div>

            {/* Original text */}
            <div className="bg-surface-container p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-serif mb-4 text-primary">Original (Turkish)</h2>
              <div className="bg-surface p-4 rounded-lg min-h-32 font-sans text-on-surface whitespace-pre-wrap border border-outline">
                {transcript || 'Speech will appear here...'}
              </div>
            </div>
          </div>

          {/* Right side - narrower */}
          <div className="w-96 space-y-6">
            {/* German translation */}
            <div className="bg-surface-container p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-serif mb-4 text-primary">German Translation</h2>
              <div className="bg-surface p-4 rounded-lg min-h-32 font-sans text-on-surface whitespace-pre-wrap border border-outline">
                {german || 'Translation will appear here...'}
              </div>
            </div>

            {/* English translation */}
            <div className="bg-surface-container p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-serif mb-4 text-primary">English Translation</h2>
              <div className="bg-surface p-4 rounded-lg min-h-32 font-sans text-on-surface whitespace-pre-wrap border border-outline">
                {english || 'Translation will appear here...'}
              </div>
            </div>
          </div>
        </div>

        {/* Floating quote - glassmorphism */}
        <div className="fixed bottom-6 right-6 bg-surface/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-outline max-w-sm">
          <blockquote className="font-serif text-primary italic">
            &ldquo;The best among you are those who learn the Quran and teach it to others.&rdquo;
          </blockquote>
          <cite className="text-sm font-sans text-on-surface-variant mt-2 block">- Prophet Muhammad (PBUH)</cite>
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="bg-outline hover:bg-outline-variant text-on-surface font-sans py-2 px-6 rounded-lg"
          >
            Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  )
}