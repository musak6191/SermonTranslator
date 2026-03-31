'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export default function SermonTranslator() {
  const [transcript, setTranscript] = useState('')
  const [german, setGerman] = useState('')
  const [english, setEnglish] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [inputText, setInputText] = useState('')
  const socketRef = useRef<Socket | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Connect to backend
    socketRef.current = io('http://localhost:3000')

    socketRef.current.on('translation', (data) => {
      setGerman(prev => prev + data.german)
      setEnglish(prev => prev + data.english)
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
    }
  }, [])

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

  const handleTextSubmit = () => {
    if (inputText.trim()) {
      setTranscript(prev => prev + inputText + ' ')
      socketRef.current?.emit('speech', { text: inputText })
      setInputText('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6">Sermon Translator</h1>
        <div className="mb-6">
          <button
            onClick={isListening ? stopListening : startListening}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
          >
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
          <div className="mt-4">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type Turkish text here..."
              className="w-full p-2 border border-gray-300 rounded"
              rows={3}
            />
            <button
              onClick={handleTextSubmit}
              className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Translate Text
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Original (Turkish)</h2>
            <div className="bg-gray-50 p-4 rounded min-h-32 whitespace-pre-wrap">{transcript}</div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Translated (German)</h2>
            <div className="bg-gray-50 p-4 rounded min-h-32 whitespace-pre-wrap">{german}</div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Translated (English)</h2>
            <div className="bg-gray-50 p-4 rounded min-h-32 whitespace-pre-wrap">{english}</div>
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