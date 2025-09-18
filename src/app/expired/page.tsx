'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function ExpiredPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl animate-bounce">⏰</div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-100">Room Expired</h1>
          <p className="text-gray-400">
            This chat room has expired and is no longer available. All messages and participants have been removed.
          </p>
        </div>

        <div className="space-y-4">
          <Button onClick={() => router.push('/')} className="w-full">
            Create New Room
          </Button>
          
          <button
            onClick={() => router.back()}
            className="w-full text-gray-400 hover:text-gray-200 transition-colors"
          >
            Go Back
          </button>
        </div>

        <div className="text-xs text-gray-500">
          Rooms automatically expire after 24 hours for privacy
        </div>
      </div>
    </div>
  )
}