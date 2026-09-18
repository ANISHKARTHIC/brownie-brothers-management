import { useState, useEffect } from 'react'
import { Lock, AlertCircle } from 'lucide-react'


interface PinLockProps {
  onUnlock: () => void
}

export function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState('')
  const [savedPin, setSavedPin] = useState<string | null>(null)
  const [mode, setMode] = useState<'ENTER' | 'SETUP' | 'CONFIRM'>('ENTER')
  const [setupPin, setSetupPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('brownie_pin')
    if (stored) {
      setSavedPin(stored)
      setMode('ENTER')
    } else {
      setMode('SETUP')
    }
  }, [])

  const handleKeyPress = (num: string) => {
    setError('')
    if (pin.length < 4) {
      const newPin = pin + num
      setPin(newPin)
      
      if (newPin.length === 4) {
        setTimeout(() => processCompletePin(newPin), 100)
      }
    }
  }

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const processCompletePin = (completePin: string) => {
    if (mode === 'ENTER') {
      if (completePin === savedPin) {
        onUnlock()
      } else {
        setError('Incorrect PIN')
        setPin('')
      }
    } else if (mode === 'SETUP') {
      setSetupPin(completePin)
      setPin('')
      setMode('CONFIRM')
    } else if (mode === 'CONFIRM') {
      if (completePin === setupPin) {
        localStorage.setItem('brownie_pin', completePin)
        setSavedPin(completePin)
        onUnlock()
      } else {
        setError('PINs do not match. Try again.')
        setPin('')
        setMode('SETUP')
      }
    }
  }

  const getTitle = () => {
    if (mode === 'ENTER') return 'Enter PIN to Unlock'
    if (mode === 'SETUP') return 'Create a 4-Digit PIN'
    return 'Confirm your PIN'
  }

  return (
    <div className="fixed inset-0 bg-[#f4e8d8] flex flex-col items-center justify-center z-[100] animate-in fade-in zoom-in duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center border border-gray-100">
        <div className="w-16 h-16 bg-[#8b5a2b]/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-[#8b5a2b]" />
        </div>
        
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{getTitle()}</h2>
        <p className="text-sm text-gray-500 mb-8 text-center">
          {mode === 'ENTER' ? 'Enter your access code to continue' : 'Keep your terminal secure'}
        </p>

        {/* PIN Indicators */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < pin.length ? 'bg-[#8b5a2b] scale-110' : 'bg-gray-200'
              }`} 
            />
          ))}
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-lg text-sm font-medium animate-in shake">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-16 rounded-2xl bg-gray-50 text-2xl font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div className="col-start-2">
            <button
              onClick={() => handleKeyPress('0')}
              className="w-full h-16 rounded-2xl bg-gray-50 text-2xl font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center"
            >
              0
            </button>
          </div>
          <div className="col-start-3">
            <button
              onClick={handleDelete}
              className="w-full h-16 rounded-2xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center text-sm font-bold uppercase tracking-wider"
            >
              Del
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
