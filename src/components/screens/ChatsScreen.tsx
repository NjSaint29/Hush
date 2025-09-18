'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { getUserRooms, type Room } from '@/lib/api'

function RoomCard({ room }: { room: Room }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const expiry = new Date(room.expires_at)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Expired')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`)
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [room.expires_at])

  const handleRoomClick = () => {
    window.location.href = `/chat/${room.room_code}`
  }

  return (
    <div 
      onClick={handleRoomClick}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-850 transition-colors active:scale-98"
    >
      <div className="flex items-center space-x-4">
        {/* Room Emoji with Countdown Ring */}
        <div className="relative">
          <div className="w-12 h-12 text-2xl bg-gray-800 rounded-full flex items-center justify-center">
            {room.emoji}
          </div>
          {/* Simple countdown indicator */}
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${
            timeLeft.includes('s') ? 'bg-red-500 animate-pulse' : 'bg-teal-500'
          }`} />
        </div>

        {/* Room Info */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-100 truncate">
            {room.name}
          </h3>
          <p className="text-sm text-gray-400">
            Expires in {timeLeft}
          </p>
        </div>

        {/* Arrow */}
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export function ChatsScreen() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadRooms()
  }, [])

  const loadRooms = async () => {
    try {
      const userRooms = await getUserRooms()
      setRooms(userRooms)
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-spin">💫</div>
          <p className="text-gray-400">Loading your chats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center">
          <span className="mr-3">💬</span>
          Your Chats
        </h1>
        <p className="text-gray-400 mt-1">
          Active anonymous chatrooms
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4">
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-center">
              <p className="text-red-400">{error}</p>
              <Button onClick={loadRooms} variant="secondary" size="sm" className="mt-3">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {rooms.length === 0 && !error ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div className="text-6xl">🏠</div>
              <h3 className="text-xl font-semibold text-gray-300">No active chats</h3>
              <p className="text-gray-500">
                Create a room or join one with a link!
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}