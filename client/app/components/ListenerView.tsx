'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export default function ListenerView() {
  const [german, setGerman] = useState('')
  const [english, setEnglish] = useState('')
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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6">Live Sermon Translation</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">German Translation</h2>
            <div className="bg-gray-50 p-4 rounded min-h-64 whitespace-pre-wrap text-lg">{german}</div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">English Translation</h2>
            <div className="bg-gray-50 p-4 rounded min-h-64 whitespace-pre-wrap text-lg">{english}</div>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Main Menu
        </button>
      </div>
    </div>
  )
}