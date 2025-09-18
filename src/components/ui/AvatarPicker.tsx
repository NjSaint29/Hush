'use client'

import { useState } from 'react'

interface AvatarPickerProps {
  value: string
  onChange: (avatar: string) => void
  label?: string
}

const AVATAR_OPTIONS = [
  '👤', '😀', '😎', '🤔', '😊', '🥳', '🤖', '👻', 
  '🦄', '🐱', '🐶', '🐸', '🦊', '🐼', '🐨', '🦝',
  '🌟', '⭐', '💫', '✨', '🔥', '💎', '🎭', '🎨'
]

export function AvatarPicker({ value, onChange, label }: AvatarPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleAvatarSelect = (avatar: string) => {
    onChange(avatar)
    setIsOpen(false)
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Avatar Display */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 text-3xl rounded-full bg-gray-800 border-2 border-gray-700 hover:border-teal-500 transition-colors flex items-center justify-center"
        >
          {value}
        </button>
        
        {/* Avatar Selection Grid */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Selection Panel */}
            <div className="absolute top-full left-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 animate-in zoom-in-95 duration-200">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Choose your avatar</h3>
                <div className="grid grid-cols-8 gap-2">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => handleAvatarSelect(avatar)}
                      className={`
                        w-8 h-8 text-xl rounded-lg transition-all
                        hover:bg-gray-800 hover:scale-110
                        ${value === avatar ? 'bg-teal-500 scale-110' : ''}
                        flex items-center justify-center
                      `}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}