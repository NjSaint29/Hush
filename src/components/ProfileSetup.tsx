'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { AvatarPicker } from './ui/AvatarPicker'
import { saveUserProfile } from '@/lib/supabase'

interface ProfileSetupProps {
  onComplete: (profile: { nickname: string; avatar: string }) => void
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('👤')
  const [error, setError] = useState('')

  const handleComplete = () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname')
      return
    }

    if (nickname.trim().length < 2) {
      setError('Nickname must be at least 2 characters')
      return
    }

    if (nickname.trim().length > 20) {
      setError('Nickname must be less than 20 characters')
      return
    }

    const profile = { nickname: nickname.trim(), avatar }
    saveUserProfile(profile.nickname, profile.avatar)
    onComplete(profile)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">👋</div>
          <h1 className="text-3xl font-bold text-gray-100">
            Welcome to Hush
          </h1>
          <p className="text-gray-400 text-lg">
            Enter a nickname to start chatting anonymously!
          </p>
        </div>

        {/* Profile Form */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl space-y-6">
          {/* Avatar Selection */}
          <div className="text-center">
            <AvatarPicker
              value={avatar}
              onChange={setAvatar}
              label="Choose your avatar"
            />
          </div>

          {/* Nickname Input */}
          <Input
            label="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your awesome alias..."
            error={error}
            maxLength={20}
            onKeyPress={(e) => e.key === 'Enter' && handleComplete()}
          />

          {/* Continue Button */}
          <Button
            onClick={handleComplete}
            disabled={!nickname.trim()}
            className="w-full"
            size="lg"
          >
            Start Chatting 🚀
          </Button>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center">
            Your profile is saved locally on this device only.
            No registration required!
          </p>
        </div>

        {/* Fun Facts */}
        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>✨ Chat rooms last 24 hours</p>
          <p>🔒 Messages disappear forever</p>
          <p>🎭 Stay completely anonymous</p>
        </div>
      </div>
    </div>
  )
}