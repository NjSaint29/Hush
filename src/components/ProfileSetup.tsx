
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Hush
          </h1>
          <p className="text-foreground/80 text-lg">
            Enter a nickname to start chatting anonymously.
          </p>
        </div>

        <div className="bg-background border border-border rounded-lg p-8 space-y-6">
          <div className="text-center">
            <AvatarPicker
              value={avatar}
              onChange={setAvatar}
              label="Choose your avatar"
            />
          </div>

          <Input
            label="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your awesome alias..."
            error={error}
            maxLength={20}
            onKeyPress={(e) => e.key === 'Enter' && handleComplete()}
          />

          <Button
            onClick={handleComplete}
            disabled={!nickname.trim()}
            className="w-full"
            size="lg"
          >
            Start Chatting
          </Button>

          <p className="text-xs text-foreground/60 text-center">
            Your profile is saved locally on this device only.
          </p>
        </div>
      </div>
    </div>
  )
}
