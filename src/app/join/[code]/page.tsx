'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AvatarPicker } from '@/components/ui/AvatarPicker'
import { joinRoom, getRoomByCode } from '@/lib/api'
import { getUserProfile, saveUserProfile } from '@/lib/supabase'

export default function JoinRoom() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.code as string
  
  const [room, setRoom] = useState<any>(null)
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('👤')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load user profile if exists
    const profile = getUserProfile()
    if (profile) {
      setNickname(profile.nickname)
      setAvatar(profile.avatar)
    }

    // Load room info
    loadRoom()
  }, [roomCode])

  const loadRoom = async () => {
    try {
      const roomData = await getRoomByCode(roomCode)
      if (!roomData) {
        setError('Room not found or expired')
        return
      }
      setRoom(roomData)
    } catch (err: any) {
      setError(err.message || 'Failed to load room')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname')
      return
    }

    setJoining(true)
    setError('')

    try {
      // Save profile
      saveUserProfile(nickname.trim(), avatar)
      
      // Join room
      await joinRoom(roomCode, nickname.trim(), avatar)
      
      // Navigate to chat
      router.push(`/chat/${roomCode}`)
    } catch (err: any) {
      setError(err.message || 'Failed to join room')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-spin">💫</div>
          <p className="text-gray-400">Loading room...</p>
        </div>
      </div>
    )
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">😕</div>
          <h1 className="text-2xl font-bold text-gray-100">Room Not Found</h1>
          <p className="text-gray-400">{error}</p>
          <Button onClick={() => router.push('/')} className="w-full">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Room Info */}
        {room && (
          <div className="text-center space-y-4">
            <div className="text-6xl">{room.emoji}</div>
            <h1 className="text-2xl font-bold text-gray-100">
              Join "{room.name}"
            </h1>
            <p className="text-gray-400">
              Choose your nickname and avatar for this anonymous chat
            </p>
          </div>
        )}

        {/* Join Form */}
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
            placeholder="Your alias for this chat..."
            error={error.includes('nickname') ? error : undefined}
            maxLength={20}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          />

          {/* Join Button */}
          <Button
            onClick={handleJoin}
            disabled={joining || !nickname.trim()}
            className="w-full"
            size="lg"
          >
            {joining ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                Joining...
              </div>
            ) : (
              'Join Room 🚀'
            )}
          </Button>

          {/* Error Display */}
          {error && !error.includes('nickname') && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Back Button */}
          <Button
            onClick={() => router.push('/')}
            variant="secondary"
            className="w-full"
          >
            Back to Home
          </Button>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-gray-500">
          <p>💫 Your profile is saved locally on this device</p>
        </div>
      </div>
    </div>
  )
}