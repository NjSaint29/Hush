'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getChatroomByLink, getMessages, sendMessage, subscribeToMessages, Message } from '@/lib/api'

export default function ChatRoom() {
  const params = useParams()
  const router = useRouter()
  const link = params.link as string
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [nickname, setNickname] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const storedUserId = localStorage.getItem(`user_${link}`)
    const storedNickname = localStorage.getItem(`nickname_${link}`)

    if (!storedUserId || !storedNickname) {
      router.push(`/join?link=${link}`)
      return
    }

    setUserId(storedUserId)
    setNickname(storedNickname)
    loadChat()
  }, [link, router])

  const loadChat = async () => {
    try {
      const chatroom = await getChatroomByLink(link)
      if (new Date(chatroom.expires_at) < new Date()) {
        router.push('/expired')
        return
      }

      const msgs = await getMessages(chatroom.id)
      setMessages(msgs)

      // Subscribe to new messages
      const channel = subscribeToMessages(chatroom.id, (message) => {
        setMessages(prev => [...prev, message])
      })

      return () => {
        channel.unsubscribe()
      }
    } catch (err) {
      setError('Failed to load chat')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() && !selectedFile) return

    try {
      const chatroom = await getChatroomByLink(link)
      await sendMessage(chatroom.id, userId, newMessage, selectedFile || undefined)
      setNewMessage('')
      setSelectedFile(null)
    } catch (err) {
      console.error('Failed to send message', err)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                {message.user?.nickname.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-baseline space-x-2">
                <span className="font-medium">{message.user?.nickname}</span>
                <span className="text-xs text-gray-400">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
              {message.message_text && (
                <p className="mt-1">{message.message_text}</p>
              )}
              {message.media_url && (
                <div className="mt-2">
                  <img
                    src={message.media_url}
                    alt="Media"
                    className="max-w-xs rounded-lg"
                    onLoad={() => {
                      // Mark as viewed and delete
                      // For now, just log
                      console.log('Media viewed')
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-700">
        <div className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200"
            >
              Send
            </button>
          </div>
          {selectedFile && (
            <div className="text-sm text-gray-400">
              Selected: {selectedFile.name}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}