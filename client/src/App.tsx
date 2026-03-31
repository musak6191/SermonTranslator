import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import './App.css'

function App() {
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
    <>
      <h1>Sermon Translator</h1>
      <div className="translator">
        <div className="input-section">
          <button onClick={isListening ? stopListening : startListening}>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
          <div className="text-input">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type Turkish text here..."
              rows={3}
            />
            <button onClick={handleTextSubmit}>Translate Text</button>
          </div>
        </div>
        <div className="text-display">
          <h2>Original (Turkish):</h2>
          <p>{transcript}</p>
          <h2>Translated (German):</h2>
          <p>{german}</p>
          <h2>Translated (English):</h2>
          <p>{english}</p>
        </div>
      </div>
    </>
  )
}

export default App