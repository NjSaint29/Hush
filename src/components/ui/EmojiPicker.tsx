
'use client'

import { useState } from 'react'

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  label?: string
}

const EMOJI_CATEGORIES = {
  faces: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙊', '🙉', '🙈', '🐒'],
  food: ['🍕', '🍔', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍟', '🍕'],
  activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🥍', '🏏', '🪃', '🥊', '🥋', '🎯'],
  objects: ['⌚', '📱', '💻', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟'],
  symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️']
}

export function EmojiPicker({ value, onChange, label }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('faces')

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-foreground/80 mb-2">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 text-4xl rounded-full bg-background border-2 border-border hover:border-primary transition-colors flex items-center justify-center"
      >
        {value}
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute top-full left-0 mt-2 w-80 bg-background border border-border rounded-xl shadow-lg z-50 animate-in zoom-in-95 duration-200">
            <div className="flex border-b border-border p-2">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
                  className={`
                    flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors capitalize
                    ${activeCategory === category 
                      ? 'bg-primary text-white' 
                      : 'text-foreground/60 hover:text-foreground hover:bg-secondary'
                    }
                  `}
                >
                  {category}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-8 gap-2 p-4 max-h-64 overflow-y-auto">
              {EMOJI_CATEGORIES[activeCategory].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="w-8 h-8 text-xl hover:bg-secondary rounded-lg transition-colors flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
