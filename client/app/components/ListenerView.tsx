'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

type Language = 'german' | 'english'

export default function ListenerView() {
  const [german, setGerman] = useState('')
  const [english, setEnglish] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('german')
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Connect to backend
    socketRef.current = io('http://localhost:3000')

    socketRef.current.on('translation', (data) => {
      setGerman(prev => prev + data.german)
      setEnglish(prev => prev + data.english)
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6">Live Sermon Translation</h1>
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={() => setSelectedLanguage('german')}
            className={`px-6 py-2 rounded-lg font-semibold ${
              selectedLanguage === 'german'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            German
          </button>
          <button
            onClick={() => setSelectedLanguage('english')}
            className={`px-6 py-2 rounded-lg font-semibold ${
              selectedLanguage === 'english'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            English
          </button>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2 text-center">{getLanguageLabel()} Translation</h2>
          <div className="bg-gray-50 p-6 rounded min-h-64 whitespace-pre-wrap text-lg text-center">
            {getCurrentTranslation() || 'Waiting for translation...'}
          </div>
        </div>
        <div className="text-center mt-6">
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  )
}