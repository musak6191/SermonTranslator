'use client'

import { useState, useEffect } from 'react'
import SermonTranslator from './SermonTranslator'
import ListenerView from './ListenerView'

export default function MainScreen() {
  const [mode, setMode] = useState<'imam' | 'listener' | null>(null)

  useEffect(() => {
    console.log('Mode changed to:', mode)
  }, [mode])

  if (mode === 'imam') {
    return <SermonTranslator />
  }

  if (mode === 'listener') {
    return <ListenerView />
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold mb-8">Sermon Translator</h1>
        <p className="mb-4">Current mode: {mode || 'main'}</p>
        <div className="space-y-4">
          <button
            onClick={() => {
              console.log('Clicked imam');
              setMode('imam');
            }}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
          >
            Translate as an Imam
          </button>
          <button
            onClick={() => {
              console.log('Clicked listener');
              setMode('listener');
            }}
            className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
          >
            Participate as a Listener
          </button>
        </div>
      </div>
    </div>
  )
}