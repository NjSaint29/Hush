
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { Modal } from '@/components/ui/Modal'
import { createRoom } from '@/lib/api'
import { getUserProfile } from '@/lib/supabase'

export function CreateScreen() {
  const [roomName, setRoomName] = useState('')
  const [roomEmoji, setRoomEmoji] = useState('💬')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdRoom, setCreatedRoom] = useState<{ room_code: string; name: string; emoji: string } | null>(null)

  const handleCreate = async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name')
      return
    }

    const profile = getUserProfile()
    if (!profile) {
      setError('Profile not found. Please refresh the page.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { room } = await createRoom(roomName.trim(), roomEmoji, profile.nickname, profile.avatar)
      setCreatedRoom(room)
      setShowSuccess(true)
      setRoomName('')
      setRoomEmoji('💬')
    } catch (err: any) {
      setError(err.message || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  const copyRoomLink = () => {
    if (createdRoom) {
      const link = `${window.location.origin}/join/${createdRoom.room_code}`
      navigator.clipboard.writeText(link)
    }
  }

  const shareRoom = () => {
    if (createdRoom && navigator.share) {
      const link = `${window.location.origin}/join/${createdRoom.room_code}`
      navigator.share({
        title: `Join "${createdRoom.name}" on Hush`,
        text: `Join my anonymous chat room: ${createdRoom.name} ${createdRoom.emoji}`,
        url: link
      })
    } else {
      copyRoomLink()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">
          Create Room
        </h1>
        <p className="text-foreground/80 mt-1">
          Start a new 24-hour anonymous chat
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center">
            <div className="text-8xl mb-4">{roomEmoji}</div>
            <h3 className="text-xl font-semibold text-foreground">
              {roomName || 'Room Name'}
            </h3>
          </div>

          <div className="space-y-6">
            <Input
              label="Room Name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter a name for your room"
              error={error.includes('name') ? error : undefined}
              maxLength={50}
            />

            <EmojiPicker
              value={roomEmoji}
              onChange={setRoomEmoji}
              label="Room Emoji"
            />

            <Button
              onClick={handleCreate}
              disabled={loading || !roomName.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mr-3" />
                  Creating...
                </div>
              ) : (
                'Create Room'
              )}
            </Button>

            {error && !error.includes('name') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Room Created!"
      >
        {createdRoom && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <div className="text-4xl">{createdRoom.emoji}</div>
              <h3 className="text-xl font-semibold text-foreground">
                {createdRoom.name}
              </h3>
              <p className="text-foreground/60">
                Code: <span className="font-mono text-primary">{createdRoom.room_code}</span>
              </p>
            </div>

            <div className="space-y-3">
              <Button onClick={shareRoom} className="w-full">
                Share Link
              </Button>
              <Button onClick={copyRoomLink} variant="secondary" className="w-full">
                Copy Link
              </Button>
              <Button 
                onClick={() => window.location.href = `/chat/${createdRoom.room_code}`}
                variant="secondary" 
                className="w-full"
              >
                Enter Room
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
