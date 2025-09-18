'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createChatroom } from '@/lib/api'

export default function CreateRoom() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleCreate = async () => {
    setLoading(true)
    setError('')

    try {
      const { link } = await createChatroom()
      router.push(`/join?link=${link}`)
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create room. Please check if database is set up.'
      setError(errorMessage)
      console.error('Create room error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Hush</h1>
          <p className="text-gray-400 mb-8">Create an anonymous chatroom</p>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>

        {error && (
          <p className="text-red-400 text-center">{error}</p>
        )}

        <div className="text-center text-sm text-gray-500">
          Room expires in 24 hours
        </div>
      </div>
    </div>
  )
}