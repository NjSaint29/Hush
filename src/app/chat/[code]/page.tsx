'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  getRoomByCode,
  joinRoom,
  getMessages,
  sendMessageWithStatus,
  subscribeToMessages,
  subscribeToReactions,
  addReaction,
  getRoomParticipants,
  setTypingStatus,
  getTypingIndicators,
  subscribeToTypingIndicators,
  markMessageAsRead,
  markMessagesAsRead,
  markMediaViewed,
  getSignedMediaUrl,
  hasViewedMedia,
  pollMessages,
  type Room,
  type Message,
  type Participant,
  type TypingIndicator
} from '@/lib/api'
import { getUserProfile } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

function MessageBubble({ message, onReaction, onReply, onLongPress, onSlideReply, onMediaView, viewedMessages }: {
  message: Message
  onReaction: (emoji: string) => void
  onReply: () => void
  onLongPress: (messageId: string) => void
  onSlideReply: (message: Message) => void
  onMediaView: (message: Message) => void
  viewedMessages: Set<string>
}) {
  const [showReactions, setShowReactions] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)
  const [isSliding, setIsSliding] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [showQuickReactions, setShowQuickReactions] = useState(false)
  const isOwn = message.participant?.device_id === localStorage.getItem('hush_device_id')

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡']

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setSwipeOffset(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX
    const diff = currentX - touchStartX

    // Only allow right swipe for reply
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 80)) // Max swipe distance
      if (diff > 30) { // Minimum swipe distance to trigger
        setIsSliding(true)
      }
    }
  }

  const handleTouchEnd = () => {
    if (isSliding && swipeOffset > 50) {
      onSlideReply(message)
    }
    setIsSliding(false)
    setSwipeOffset(0)
  }

  const handleLongPress = () => {
    // WhatsApp-style: show quick reaction menu instead of modal
    setShowQuickReactions(true)
    setTimeout(() => setShowQuickReactions(false), 3000) // Auto-hide after 3s
  }

  const handleQuickReaction = (emoji: string) => {
    onReaction(emoji)
    setShowQuickReactions(false)
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 relative`}>
      {/* Reply indicator for swipe gesture */}
      {isSliding && (
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10">
          <div className="bg-blue-500 text-white rounded-full p-2 shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        </div>
      )}

      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative transition-transform duration-200 ${
          isOwn
            ? 'bg-teal-500 text-white'
            : 'bg-gray-800 text-gray-100'
        } ${isSliding ? 'transform translate-x-16' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault()
          handleLongPress()
        }}
        style={{
          touchAction: 'pan-y',
          transform: `translateX(${swipeOffset}px)`
        }}
      >
        {/* Reply indicator */}
        {message.reply_to && (
          <div className="text-xs opacity-75 mb-1 border-l-2 border-gray-600 pl-2">
            <div className="text-xs font-medium">{message.reply_to.participant?.nickname}</div>
            <div className="truncate">{message.reply_to.content?.substring(0, 50)}...</div>
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <p className="text-sm">{message.content}</p>
        )}

        {/* Media */}
        {message.media_url && (
          <div className="mt-2">
            {message.status === 'pending' ? (
              // Loading state for pending uploads
              <div className="w-32 h-32 bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                  <span className="text-xs text-gray-400">Uploading...</span>
                </div>
              </div>
            ) : message.is_view_once ? (
              // View-once media - always show placeholder
              <div className="relative">
                {viewedMessages.has(message.id) ? (
                  // Already viewed - show consumed state
                  <div className="w-32 h-32 bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-600">
                    <div className="text-center">
                      <span className="text-2xl">👁️‍🗨️</span>
                      <p className="text-xs text-gray-500 mt-1">Viewed</p>
                    </div>
                  </div>
                ) : (
                  // Not viewed - show tap to view
                  <div className="relative cursor-pointer" onClick={() => onMediaView(message)}>
                    <div className="w-32 h-32 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-gray-600 hover:border-gray-500 transition-colors">
                      <div className="text-center">
                        <span className="text-2xl">
                          {message.message_type === 'image' ? '📷' : '🎥'}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">Tap to view</p>
                      </div>
                    </div>
                    {isOwn && (
                      <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                        👁️
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Regular media display (non-view-once)
              <div className="relative">
                {message.message_type === 'image' ? (
                  <img
                    src={message.media_url}
                    alt="Shared media"
                    className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={message.media_url}
                    controls
                    className="rounded-lg max-w-full"
                    preload="metadata"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Message actions and timestamp */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs opacity-75">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && (
              <span className="text-xs opacity-75 ml-2 flex items-center">
                {message.status === 'pending' && (
                  <span className="animate-spin">🕐</span>
                )}
                {message.status === 'sent' && (
                  <span className="text-gray-300">✓</span>
                )}
                {message.status === 'delivered' && (
                  <span className="text-gray-300">✓✓</span>
                )}
                {message.status === 'viewed' && (
                  <span className="text-blue-400">✓✓</span>
                )}
              </span>
            )}
          </div>

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
                {reaction.emoji} {reaction.participant ? 1 : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp-style Quick Reactions Menu */}
      {showQuickReactions && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-gray-900 rounded-full p-2 shadow-lg border border-gray-700 flex space-x-1">
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
              <button
                key={emoji}
                onClick={() => handleQuickReaction(emoji)}
                className="w-8 h-8 hover:scale-125 transition-transform rounded-full hover:bg-gray-800 flex items-center justify-center text-lg"
              >
                {emoji}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-600 mx-1"></div>
            <button
              onClick={() => {
                setShowQuickReactions(false)
                onLongPress(message.id) // Open full reaction picker
              }}
              className="w-8 h-8 hover:scale-125 transition-transform rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-400"
            >
              ➕
            </button>
          </div>
          {/* Arrow pointing to message */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
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
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [lastMessageId, setLastMessageId] = useState<string>('')
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [viewedMessages, setViewedMessages] = useState<Set<string>>(new Set())
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [showMediaOptions, setShowMediaOptions] = useState(false)
  const [viewOnceMedia, setViewOnceMedia] = useState<{ message: Message; signedUrl: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
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

  // Typing indicators
  useEffect(() => {
    if (!room) return

    const typingSubscription = subscribeToTypingIndicators(room.id, (indicators) => {
      setTypingIndicators(indicators)
    })

    return () => {
      typingSubscription.unsubscribe()
    }
  }, [room])

  // AJAX polling fallback
  useEffect(() => {
    if (!room) return

    const pollInterval = setInterval(async () => {
      try {
        const newMessages = await pollMessages(room.id, lastMessageId)
        if (newMessages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const filtered = newMessages.filter(m => !existingIds.has(m.id))
            return [...prev, ...filtered]
          })
          setLastMessageId(newMessages[newMessages.length - 1].id)
        }
      } catch (err) {
        console.error('Polling failed:', err)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [room, lastMessageId])

  // Mark messages as read when they come into view
  useEffect(() => {
    if (!room) return

    const markAsRead = async () => {
      try {
        await markMessagesAsRead(room.id)
      } catch (err) {
        console.error('Failed to mark messages as read:', err)
      }
    }

    markAsRead()
  }, [messages, room])

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

    const messageContent = newMessage.trim()
    const replyId = replyTo?.id

    // Clear input immediately for better UX
    setNewMessage('')
    setReplyTo(null)

    // Stop typing indicator
    if (isTyping && room) {
      await setTypingStatus(room.id, false)
      setIsTyping(false)
    }

    try {
      // Optimistic UI: Message appears instantly with pending status
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        room_id: room.id,
        participant_id: localStorage.getItem('hush_device_id') || '',
        content: messageContent,
        message_type: 'text',
        media_url: null,
        is_view_once: false,
        reply_to_id: replyId || null,
        status: 'pending',
        read_by: [],
        created_at: new Date().toISOString(),
        participant: {
          id: localStorage.getItem('hush_device_id') || '',
          room_id: room.id,
          device_id: localStorage.getItem('hush_device_id') || '',
          nickname: getUserProfile()?.nickname || 'You',
          avatar: getUserProfile()?.avatar || '👤',
          is_admin: false,
          joined_at: new Date().toISOString(),
          last_seen: new Date().toISOString()
        }
      }

      // Add to local state immediately
      setMessages(prev => [...prev, tempMessage])

      // Send to server asynchronously
      const sentMessage = await sendMessageWithStatus(
        room.id,
        messageContent,
        'text',
        undefined,
        false,
        replyId
      )

      // Replace temp message with real one
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id ? sentMessage : msg
      ))

    } catch (err: any) {
      // Remove failed message and show error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
      setError(err.message || 'Failed to send message')

      // Restore input for retry
      setNewMessage(messageContent)
      if (replyId) {
        // Find and restore reply context
        const replyMessage = messages.find(m => m.id === replyId)
        if (replyMessage) setReplyTo(replyMessage)
      }
    }
  }

  const handleInputChange = async (value: string) => {
    setNewMessage(value)

    if (!room) return

    // Handle typing indicator
    const shouldBeTyping = value.length > 0
    if (shouldBeTyping !== isTyping) {
      try {
        await setTypingStatus(room.id, shouldBeTyping)
        setIsTyping(shouldBeTyping)
      } catch (err) {
        console.error('Failed to update typing status:', err)
      }
    }
  }

  const handleMessageLongPress = (messageId: string) => {
    setShowReactionPicker(messageId)
  }

  const handleReactionSelect = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji)
      setShowReactionPicker(null)
    } catch (err) {
      console.error('Failed to add reaction:', err)
    }
  }

  const handleSlideToReply = (message: Message) => {
    setReplyTo(message)
  }

  const handleMediaView = async (message: Message) => {
    if (!message.is_view_once) return

    // Double-check if already viewed (both local state and server)
    if (viewedMessages.has(message.id)) {
      console.log('Media already viewed locally')
      return
    }

    try {
      // Check server-side if already viewed
      const alreadyViewed = await hasViewedMedia(message.id)
      if (alreadyViewed) {
        console.log('Media already viewed on server')
        setViewedMessages(prev => new Set([...prev, message.id]))
        return
      }

      // Generate signed URL for secure, temporary access
      const urlParts = message.media_url!.split('/')
      const fileName = urlParts[urlParts.length - 1]

      // Generate signed URL valid for only 30 seconds
      const signedUrl = await getSignedMediaUrl(fileName, 30)

      if (!signedUrl) {
        throw new Error('Failed to generate secure access URL')
      }

      // Open media in modal immediately
      setViewOnceMedia({ message, signedUrl })

      // Mark as viewed immediately to prevent re-access
      await markMediaViewed(message.id)
      setViewedMessages(prev => new Set([...prev, message.id]))

      // Update message status in UI
      setMessages(prev => prev.map(msg =>
        msg.id === message.id
          ? { ...msg, status: 'viewed' as const, media_url: null }
          : msg
      ))

    } catch (err: any) {
      console.error('Failed to handle view-once media:', err)

      // If it's already viewed, update local state
      if (err.message?.includes('already viewed')) {
        setViewedMessages(prev => new Set([...prev, message.id]))
      }

      // Close modal on error
      setViewOnceMedia(null)
    }
  }

  const handleCloseViewOnceModal = () => {
    // Clear the signed URL and close modal
    setViewOnceMedia(null)
  }

  const handleFileUpload = async (file: File) => {
    if (!room) return

    // Clear reply context
    const replyId = replyTo?.id
    setReplyTo(null)

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `chat-media/${room.id}/${fileName}`

    // Determine message type
    const messageType = file.type.startsWith('image/') ? 'image' : 'video'

    // Create optimistic media message (appears immediately)
    const optimisticMessage: Message = {
      id: `temp-media-${Date.now()}`,
      room_id: room.id,
      participant_id: localStorage.getItem('hush_device_id') || '',
      content: null,
      message_type: messageType,
      media_url: null, // Will be set after upload
      is_view_once: true, // All media is view-once
      reply_to_id: replyId || null,
      status: 'pending',
      read_by: [],
      created_at: new Date().toISOString(),
      participant: {
        id: localStorage.getItem('hush_device_id') || '',
        room_id: room.id,
        device_id: localStorage.getItem('hush_device_id') || '',
        nickname: getUserProfile()?.nickname || 'You',
        avatar: getUserProfile()?.avatar || '👤',
        is_admin: false,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString()
      }
    }

    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimisticMessage])
    setUploadingMedia(true)

    try {
      // Upload file using Supabase standard upload pattern
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        throw new Error(`Upload failed: ${error.message}`)
      }

      console.log('Upload successful:', data)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      // Verify the URL is accessible
      if (!publicUrl) {
        throw new Error('Failed to generate public URL')
      }

      // Send message with media to database
      const sentMessage = await sendMessageWithStatus(
        room.id,
        '', // No text content for media messages
        messageType,
        publicUrl,
        true, // Always view-once
        replyId
      )

      // Replace optimistic message with real message
      setMessages(prev => prev.map(msg =>
        msg.id === optimisticMessage.id ? sentMessage : msg
      ))

      console.log('Media message sent successfully')
    } catch (err: any) {
      console.error('File upload failed:', err)

      // Remove failed optimistic message
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))

      // Show error
      setError(err.message || 'Failed to upload media')
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please select an image or video file')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    // Upload file immediately (all media is view-once)
    handleFileUpload(file)
    event.target.value = '' // Reset input
  }

  const handleMediaButtonClick = () => {
    // Directly open file picker (no options modal needed)
    fileInputRef.current?.click()
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
            onLongPress={handleMessageLongPress}
            onSlideReply={handleSlideToReply}
            onMediaView={handleMediaView}
            viewedMessages={viewedMessages}
          />
        ))}

        {/* Typing indicators */}
        {typingIndicators.length > 0 && (
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingIndicators.length === 1
                ? `${typingIndicators[0].participant?.nickname || 'Someone'} is typing...`
                : `${typingIndicators.length} people are typing...`
              }
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp-style Reply Preview */}
      {replyTo && (
        <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-blue-400">
                  Replying to {replyTo.participant?.nickname}
                </p>
              </div>
              <div className="text-sm text-gray-300 truncate">
                {replyTo.content ||
                 (replyTo.media_url ?
                   (replyTo.message_type === 'image' ? '📷 Photo' : '🎥 Video') :
                   'Media'
                 )
                }
              </div>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-gray-400 hover:text-gray-200 ml-2 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex space-x-3 items-end">
          {/* Media Upload Button */}
          <button
            onClick={handleMediaButtonClick}
            disabled={uploadingMedia}
            className="p-3 bg-gray-800 border border-gray-700 rounded-full text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Share view-once media"
          >
            {uploadingMedia ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            title="Select image or video to share (view-once)"
          />

          <input
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-full text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || uploadingMedia}
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

      {/* Reaction Picker Modal */}
      <Modal
        isOpen={!!showReactionPicker}
        onClose={() => setShowReactionPicker(null)}
        title="Add Reaction"
      >
        <div className="grid grid-cols-6 gap-3">
          {['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '👏', '🤔', '😍', '🙌', '💯'].map(emoji => (
            <button
              key={emoji}
              onClick={() => showReactionPicker && handleReactionSelect(showReactionPicker, emoji)}
              className="text-2xl hover:scale-110 transition-transform p-3 bg-gray-800 rounded-lg hover:bg-gray-700"
            >
              {emoji}
            </button>
          ))}
        </div>
      </Modal>

      {/* View-Once Media Modal */}
      {viewOnceMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-full max-h-full">
            {/* Close button */}
            <button
              onClick={handleCloseViewOnceModal}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors bg-gray-800 rounded-full p-2"
              title="Close and delete media"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Media content */}
            <div className="bg-gray-900 rounded-lg overflow-hidden max-w-4xl max-h-[80vh] shadow-2xl">
              {viewOnceMedia.message.message_type === 'image' ? (
                <img
                  src={viewOnceMedia.signedUrl}
                  alt="View-once media"
                  className="w-full h-auto max-h-[70vh] object-contain"
                  onError={() => {
                    console.error('Failed to load view-once image')
                    handleCloseViewOnceModal()
                  }}
                  onLoad={() => {
                    console.log('View-once image loaded successfully')
                  }}
                />
              ) : (
                <video
                  src={viewOnceMedia.signedUrl}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[70vh]"
                  onError={() => {
                    console.error('Failed to load view-once video')
                    handleCloseViewOnceModal()
                  }}
                  onLoadedData={() => {
                    console.log('View-once video loaded successfully')
                  }}
                />
              )}

              {/* Media info and warnings */}
              <div className="p-4 bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">
                      {viewOnceMedia.message.participant?.avatar}
                    </span>
                    <span className="text-gray-200 font-medium">
                      {viewOnceMedia.message.participant?.nickname}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(viewOnceMedia.message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Security warnings */}
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-red-400 font-medium flex items-center">
                    <span className="mr-2">🔒</span>
                    This media is view-once and will be permanently deleted
                  </div>
                  <div className="text-xs text-yellow-400 flex items-center">
                    <span className="mr-2">⚠️</span>
                    Close this view to complete deletion
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={handleCloseViewOnceModal}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Close & Delete Media
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}