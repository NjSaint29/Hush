'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { 
  getRoomByCode, 
  joinRoom, 
  getMessages, 
  sendMessage, 
  subscribeToMessages,
  subscribeToReactions,
  addReaction,
  getRoomParticipants,
  type Room, 
  type Message, 
  type Participant 
} from '@/lib/api'
import { getUserProfile } from '@/lib/supabase'

function MessageBubble({ message, onReaction, onReply }: { 
  message: Message
  onReaction: (emoji: string) => void
  onReply: () => void
}) {
  const [showReactions, setShowReactions] = useState(false)
  const isOwn = message.participant?.device_id === localStorage.getItem('hush_device_id')

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡']

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
        isOwn 
          ? 'bg-teal-500 text-white' 
          : 'bg-gray-800 text-gray-100'
      }`}>
        {/* Reply indicator */}
        {message.reply_to && (
          <div className="text-xs opacity-75 mb-1 border-l-2 border-gray-600 pl-2">
            {message.reply_to.content?.substring(0, 50)}...
          </div>
        )}
        
        {/* Message content */}
        {message.content && (
          <p className="text-sm">{message.content}</p>
        )}
        
        {/* Media */}
        {message.media_url && (
          <div className="mt-2">
            <img 
              src={message.media_url} 
              alt="Media" 
              className="rounded-lg max-w-full"
            />
          </div>
        )}
        
        {/* Message actions */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs opacity-75">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          {!isOwn && (
            <div className="flex space-x-1">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="text-xs opacity-75 hover:opacity-100"
              >
                😊
              </button>
              <button
                onClick={onReply}
                className="text-xs opacity-75 hover:opacity-100"
              >
                ↩️
              </button>
            </div>
          )}
        </div>
        
        {/* Reaction picker */}
        {showReactions && (
          <div className="flex space-x-1 mt-2">
            {reactions.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onReaction(emoji)
                  setShowReactions(false)
                }}
                className="text-lg hover:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        
        {/* Message reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map(reaction => (
              <span key={reaction.id} className="text-sm bg-gray-700 rounded-full px-2 py-1">
                {reaction.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatRoom() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.code as string
  
  const [room, setRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showParticipants, setShowParticipants] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageSubscription = useRef<any>(null)
  const reactionSubscription = useRef<any>(null)

  useEffect(() => {
    initializeChat()
    
    return () => {
      if (messageSubscription.current) messageSubscription.current.unsubscribe()
      if (reactionSubscription.current) reactionSubscription.current.unsubscribe()
    }
  }, [roomCode])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeChat = async () => {
    try {
      // Get room info
      const roomData = await getRoomByCode(roomCode)
      if (!roomData) {
        router.push('/expired')
        return
      }

      // Check if expired
      if (new Date(roomData.expires_at) < new Date()) {
        router.push('/expired')
        return
      }

      setRoom(roomData)

      // Auto-join user if they have a profile
      const profile = getUserProfile()
      if (profile) {
        try {
          await joinRoom(roomCode, profile.nickname, profile.avatar)
        } catch (err) {
          // User might already be in room, that's ok
        }
      } else {
        // Redirect to join page
        router.push(`/join/${roomCode}`)
        return
      }

      // Load messages and participants
      const [messagesData, participantsData] = await Promise.all([
        getMessages(roomData.id),
        getRoomParticipants(roomData.id)
      ])

      setMessages(messagesData)
      setParticipants(participantsData)

      // Set up subscriptions
      messageSubscription.current = subscribeToMessages(roomData.id, (message) => {
        setMessages(prev => [...prev, message])
      })

      reactionSubscription.current = subscribeToReactions(roomData.id, () => {
        // Reload messages to get updated reactions
        getMessages(roomData.id).then(setMessages)
      })

    } catch (err: any) {
      setError(err.message || 'Failed to load chat')
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !room) return

    try {
      await sendMessage(
        room.id, 
        newMessage.trim(), 
        'text', 
        undefined, 
        false,
        replyTo?.id
      )
      setNewMessage('')
      setReplyTo(null)
    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji)
    } catch (err) {
      console.error('Failed to add reaction:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-spin">💫</div>
          <p className="text-gray-400">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">😕</div>
          <h1 className="text-2xl font-bold text-gray-100">Chat Error</h1>
          <p className="text-gray-400">{error}</p>
          <Button onClick={() => router.push('/')} className="w-full">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-2xl">{room?.emoji}</div>
          <div>
            <h1 className="font-semibold text-gray-100">{room?.name}</h1>
            <p className="text-xs text-gray-400">{participants.length} participants</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowParticipants(true)}
          className="text-gray-400 hover:text-gray-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onReaction={(emoji) => handleReaction(message.id, emoji)}
            onReply={() => setReplyTo(message)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-400">Replying to {replyTo.participant?.nickname}</p>
              <p className="text-sm text-gray-300 truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex space-x-3">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-full text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="rounded-full px-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Participants Modal */}
      <Modal
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
        title="Room Participants"
      >
        <div className="space-y-3">
          {participants.map((participant) => (
            <div key={participant.id} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
              <div className="w-10 h-10 text-xl bg-gray-700 rounded-full flex items-center justify-center">
                {participant.avatar}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-100">{participant.nickname}</p>
                <p className="text-xs text-gray-400">
                  {participant.is_admin ? 'Admin' : 'Member'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}