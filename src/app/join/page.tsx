'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinChatroom } from '@/lib/api'

export default function JoinRoom() {
  const [link, setLink] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { user, chatroom } = await joinChatroom(link, nickname)
      localStorage.setItem(`user_${link}`, user.id)
      localStorage.setItem(`nickname_${link}`, nickname)
      router.push(`/chat/${link}`)
    } catch (err: any) {
      setError(err.message || 'Failed to join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Hush</h1>
          <p className="text-gray-400 mb-8">Join an anonymous chatroom</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label htmlFor="link" className="block text-sm font-medium mb-2">
              Room Link
            </label>
            <input
              id="link"
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Enter room link"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm font-medium mb-2">
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Choose a nickname"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </form>

        {error && (
          <p className="text-red-400 text-center">{error}</p>
        )}

        <div className="text-center">
          <a href="/create" className="text-blue-400 hover:text-blue-300">
            Create a new room instead
          </a>
        </div>
      </div>
    </div>
  )
}