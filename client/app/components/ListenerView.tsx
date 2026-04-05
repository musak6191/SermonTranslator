'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRouter } from 'next/navigation'

type Language = 'german' | 'english'

export default function ListenerView() {
  const [german, setGerman] = useState('')
  const [english, setEnglish] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('german')
  const [listenerCount, setListenerCount] = useState(0)
  const [isLive, setIsLive] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Connect to backend
    socketRef.current = io('http://localhost:3000')

    socketRef.current.on('translation', (data) => {
      setGerman(prev => prev + data.german)
      setEnglish(prev => prev + data.english)
      setIsLive(true)
    })

    socketRef.current.on('listenerCount', (count) => {
      setListenerCount(count)
    })

    socketRef.current.on('sessionStatus', (data) => {
      setIsLive(data.active)
    })

    socketRef.current.on('sessionEnded', () => {
      setIsLive(false)
      setGerman('')
      setEnglish('')
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  const getCurrentTranslation = () => {
    return selectedLanguage === 'german' ? german : english
  }

  const getLanguageLabel = () => {
    return selectedLanguage === 'german' ? 'German' : 'English'
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-container-low p-6 border-b border-outline-variant">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-serif text-primary">Live Feed</h1>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-success' : 'bg-error'}`}></div>
              <span className="font-sans text-on-surface-variant">
                {isLive ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="text-center">
              <div className="text-sm font-sans text-on-surface-variant">Listeners</div>
              <div className="text-xl font-serif text-primary">{listenerCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Language selection */}
        <div className="mb-8 flex justify-center">
          <div className="bg-surface-container p-2 rounded-xl shadow-sm">
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedLanguage('german')}
                className={`px-6 py-3 rounded-lg font-sans transition-colors ${
                  selectedLanguage === 'german'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface'
                }`}
              >
                German
              </button>
              <button
                onClick={() => setSelectedLanguage('english')}
                className={`px-6 py-3 rounded-lg font-sans transition-colors ${
                  selectedLanguage === 'english'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Main translation display - asymmetrical */}
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1">
            <div className="bg-surface-container p-8 rounded-xl shadow-sm">
              <h2 className="text-2xl font-serif mb-6 text-primary text-center">
                {getLanguageLabel()} Translation
              </h2>
              <div className="bg-surface p-6 rounded-lg min-h-96 font-sans text-on-surface text-lg leading-relaxed whitespace-pre-wrap border border-outline">
                {getCurrentTranslation() || 'Waiting for live translation to begin...'}
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="w-80 space-y-6">
            {/* Session info */}
            <div className="bg-surface-container p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-serif mb-4 text-primary">Session Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-sans text-on-surface-variant">Status</span>
                  <span className={`font-sans ${isLive ? 'text-success' : 'text-error'}`}>
                    {isLive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-on-surface-variant">Listeners</span>
                  <span className="font-sans text-primary">{listenerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-on-surface-variant">Language</span>
                  <span className="font-sans text-primary">{getLanguageLabel()}</span>
                </div>
              </div>
            </div>

            {/* Inspirational quote */}
            <div className="bg-surface-container p-6 rounded-xl shadow-sm">
              <blockquote className="font-serif text-primary italic text-center">
                &ldquo;Indeed, in the remembrance of Allah do hearts find rest.&rdquo;
              </blockquote>
              <cite className="text-sm font-sans text-on-surface-variant mt-3 block text-center">
                - Quran 13:28
              </cite>
            </div>
          </div>
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