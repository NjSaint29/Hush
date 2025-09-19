import { supabase, type Room, type Participant, type Message, type Reaction, type TypingIndicator, type MessageView, getDeviceId } from './supabase'

// Re-export types for convenience
export type { Room, Participant, Message, Reaction, TypingIndicator, MessageView }

// Room Management
export async function createRoom(name: string, emoji: string, nickname: string, avatar: string): Promise<{ room: Room; participant: Participant }> {
  const deviceId = getDeviceId()
  const adminId = crypto.randomUUID()
  
  // Generate unique room code
  let roomCode = ''
  let isUnique = false
  
  while (!isUnique) {
    roomCode = Array.from({ length: 8 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('')
    
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode)
      .single()
    
    if (!existing) isUnique = true
  }
  
  // Set expiry to 24 hours from now
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  
  // Create room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      name,
      emoji,
      admin_id: adminId,
      room_code: roomCode,
      expires_at: expiresAt
    })
    .select()
    .single()
  
  if (roomError) throw roomError
  
  // Create admin participant
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert({
      room_id: room.id,
      device_id: deviceId,
      nickname,
      avatar,
      is_admin: true
    })
    .select()
    .single()
  
  if (participantError) throw participantError
  
  return { room, participant }
}

export async function joinRoom(roomCode: string, nickname: string, avatar: string): Promise<{ room: Room; participant: Participant }> {
  const deviceId = getDeviceId()
  
  // Find room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', roomCode)
    .eq('is_active', true)
    .single()
  
  if (roomError || !room) {
    throw new Error('Room not found or expired')
  }
  
  // Check if room is expired
  if (new Date(room.expires_at) < new Date()) {
    throw new Error('Room has expired')
  }
  
  // Check if user already exists in room
  const { data: existingParticipant } = await supabase
    .from('participants')
    .select('*')
    .eq('room_id', room.id)
    .eq('device_id', deviceId)
    .single()
  
  if (existingParticipant) {
    return { room, participant: existingParticipant }
  }
  
  // Create new participant
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert({
      room_id: room.id,
      device_id: deviceId,
      nickname,
      avatar
    })
    .select()
    .single()
  
  if (participantError) throw participantError
  
  return { room, participant }
}

export async function getRoomByCode(roomCode: string): Promise<Room | null> {
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', roomCode)
    .eq('is_active', true)
    .single()
  
  return room
}

export async function getUserRooms(): Promise<Room[]> {
  const deviceId = getDeviceId()
  
  const { data: rooms } = await supabase
    .from('rooms')
    .select(`
      *,
      participants!inner(device_id)
    `)
    .eq('participants.device_id', deviceId)
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  
  return rooms || []
}

// Message Management
export async function sendMessage(
  roomId: string, 
  content: string, 
  messageType: 'text' | 'image' | 'video' = 'text',
  mediaUrl?: string,
  isViewOnce?: boolean,
  replyToId?: string
): Promise<Message> {
  const deviceId = getDeviceId()
  
  // Get participant
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('room_id', roomId)
    .eq('device_id', deviceId)
    .single()
  
  if (!participant) {
    throw new Error('You are not a participant in this room')
  }
  
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      participant_id: participant.id,
      content,
      message_type: messageType,
      media_url: mediaUrl,
      is_view_once: isViewOnce || false,
      reply_to_id: replyToId
    })
    .select(`
      *,
      participant:participants(*),
      reply_to:messages(
        *,
        participant:participants(*)
      )
    `)
    .single()
  
  if (error) throw error
  return message
}

export async function getMessages(roomId: string): Promise<Message[]> {
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      participant:participants(*),
      reply_to:messages(
        *,
        participant:participants(*)
      ),
      reactions(
        *,
        participant:participants(*)
      )
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
  
  return messages || []
}

export async function addReaction(messageId: string, emoji: string): Promise<void> {
  const deviceId = getDeviceId()
  
  // Get participant from any room they're in (we'll validate they can access this message)
  const { data: participant } = await supabase
    .from('participants')
    .select('id, room_id')
    .eq('device_id', deviceId)
    .single()
  
  if (!participant) {
    throw new Error('You are not a participant')
  }
  
  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('participant_id', participant.id)
    .eq('emoji', emoji)
    .single()
  
  if (existing) {
    // Remove reaction if it exists
    await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id)
  } else {
    // Add reaction
    await supabase
      .from('reactions')
      .insert({
        message_id: messageId,
        participant_id: participant.id,
        emoji
      })
  }
}

// Real-time subscriptions
export function subscribeToMessages(roomId: string, onMessage: (message: Message) => void) {
  return supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        // Fetch the full message with relations
        const { data: message } = await supabase
          .from('messages')
          .select(`
            *,
            participant:participants(*),
            reply_to:messages(
              *,
              participant:participants(*)
            ),
            reactions(
              *,
              participant:participants(*)
            )
          `)
          .eq('id', payload.new.id)
          .single()
        
        if (message) {
          onMessage(message)
        }
      }
    )
    .subscribe()
}

export function subscribeToReactions(roomId: string, onReaction: (reaction: any) => void) {
  return supabase
    .channel(`reactions:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reactions'
      },
      async (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          // Verify this reaction belongs to a message in our room
          const messageId = payload.new?.message_id || payload.old?.message_id
          if (messageId) {
            const { data: message } = await supabase
              .from('messages')
              .select('room_id')
              .eq('id', messageId)
              .single()
            
            if (message?.room_id === roomId) {
              const reactionData = payload.new || payload.old
              onReaction({
                ...reactionData,
                eventType: payload.eventType
              })
            }
          }
        }
      }
    )
    .subscribe()
}

// Admin functions
export async function updateRoom(roomId: string, updates: { name?: string; emoji?: string }): Promise<void> {
  const deviceId = getDeviceId()
  
  // Verify user is admin
  const { data: participant } = await supabase
    .from('participants')
    .select('is_admin')
    .eq('room_id', roomId)
    .eq('device_id', deviceId)
    .single()
  
  if (!participant?.is_admin) {
    throw new Error('Only room admin can update room settings')
  }
  
  const { error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', roomId)
  
  if (error) throw error
}

export async function kickParticipant(roomId: string, participantId: string): Promise<void> {
  const deviceId = getDeviceId()
  
  // Verify user is admin
  const { data: admin } = await supabase
    .from('participants')
    .select('is_admin')
    .eq('room_id', roomId)
    .eq('device_id', deviceId)
    .single()
  
  if (!admin?.is_admin) {
    throw new Error('Only room admin can kick participants')
  }
  
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', participantId)
    .eq('room_id', roomId)
  
  if (error) throw error
}

export async function getRoomParticipants(roomId: string): Promise<Participant[]> {
  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true })

  return participants || []
}

// Enhanced Features API Functions

// Typing Indicators
export async function setTypingStatus(roomId: string, isTyping: boolean): Promise<void> {
  const deviceId = getDeviceId()

  // Get participant
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('room_id', roomId)
    .eq('device_id', deviceId)
    .single()

  if (!participant) {
    throw new Error('You are not a participant in this room')
  }

  const { error } = await supabase.rpc('set_typing_status', {
    room_uuid: roomId,
    participant_uuid: participant.id,
    typing: isTyping
  })

  if (error) throw error
}

export async function getTypingIndicators(roomId: string): Promise<TypingIndicator[]> {
  const { data: typingIndicators } = await supabase.rpc('get_active_typing', {
    room_uuid: roomId
  })

  return typingIndicators || []
}

export function subscribeToTypingIndicators(roomId: string, onTypingChange: (indicators: TypingIndicator[]) => void) {
  return supabase
    .channel(`typing:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators'
      },
      async () => {
        // Fetch current typing indicators
        const indicators = await getTypingIndicators(roomId)
        onTypingChange(indicators)
      }
    )
    .subscribe()
}

// Message Status and Read Tracking
export async function updateMessageStatus(messageId: string, status: 'pending' | 'sent' | 'delivered' | 'viewed'): Promise<void> {
  const { error } = await supabase.rpc('update_message_status', {
    msg_id: messageId,
    new_status: status
  })

  if (error) throw error
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const deviceId = getDeviceId()

  // Get participant from any room
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('device_id', deviceId)
    .single()

  if (!participant) {
    throw new Error('You are not a participant')
  }

  const { error } = await supabase.rpc('mark_message_read', {
    msg_id: messageId,
    participant_uuid: participant.id
  })

  if (error) throw error
}

export async function markMessagesAsRead(roomId: string): Promise<void> {
  const deviceId = getDeviceId()

  // Get participant
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('room_id', roomId)
    .eq('device_id', deviceId)
    .single()

  if (!participant) return

  // Get unread messages
  const { data: unreadMessages } = await supabase
    .from('messages')
    .select('id')
    .eq('room_id', roomId)
    .not('read_by', 'cs', `{${participant.id}}`)

  if (unreadMessages) {
    for (const message of unreadMessages) {
      await markMessageAsRead(message.id)
    }
  }
}

// View-once Media - Enhanced Security
export async function markMediaViewed(messageId: string): Promise<void> {
  const deviceId = getDeviceId()

  // Get participant
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('device_id', deviceId)
    .single()

  if (!participant) {
    throw new Error('Participant not found')
  }

  // Check if message is view-once and get current view status
  const { data: message } = await supabase
    .from('messages')
    .select('is_view_once, media_url, read_by')
    .eq('id', messageId)
    .single()

  if (!message?.is_view_once) {
    throw new Error('Message is not view-once')
  }

  // Check if already viewed by this participant
  if (message.read_by && message.read_by.includes(participant.id)) {
    throw new Error('Media already viewed')
  }

  // Mark as viewed in database
  await markMessageAsRead(messageId)

  // For view-once media, delete the file from storage immediately after viewing
  if (message.media_url) {
    try {
      // Extract filename from URL
      const urlParts = message.media_url.split('/')
      const fileName = urlParts[urlParts.length - 1]

      // Delete from storage to prevent re-access
      await supabase.storage
        .from('media')
        .remove([fileName])

      // Update message to remove media_url and mark as consumed
      await supabase
        .from('messages')
        .update({
          media_url: null,
          status: 'viewed'
        })
        .eq('id', messageId)

      console.log('View-once media deleted and marked as viewed')

    } catch (error) {
      console.error('Failed to delete view-once media:', error)
      // Even if deletion fails, mark as viewed to prevent re-access attempts
      await supabase
        .from('messages')
        .update({ status: 'viewed' })
        .eq('id', messageId)
    }
  }
}

// Check if media has been viewed by current user
export async function hasViewedMedia(messageId: string): Promise<boolean> {
  const deviceId = getDeviceId()

  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('device_id', deviceId)
    .single()

  if (!participant) return false

  const { data: message } = await supabase
    .from('messages')
    .select('read_by')
    .eq('id', messageId)
    .single()

  return message?.read_by?.includes(participant.id) || false
}

// Generate signed URL for view-once media
export async function getSignedMediaUrl(fileName: string, expiresIn: number = 60): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUrl(fileName, expiresIn)

    if (error) throw error
    return data.signedUrl
  } catch (error) {
    console.error('Failed to generate signed URL:', error)
    return null
  }
}

// Enhanced Message Sending with Status
export async function sendMessageWithStatus(
  roomId: string,
  content: string,
  messageType: 'text' | 'image' | 'video' = 'text',
  mediaUrl?: string,
  isViewOnce?: boolean,
  replyToId?: string
): Promise<Message> {
  // First create message with pending status
  const message = await sendMessage(roomId, content, messageType, mediaUrl, isViewOnce, replyToId)

  // Update status to sent
  await updateMessageStatus(message.id, 'sent')

  return message
}

// AJAX Polling for Messages (fallback for when real-time fails)
export async function pollMessages(roomId: string, lastMessageId?: string): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select(`
      *,
      participant:participants(*),
      reply_to:messages(
        *,
        participant:participants(*)
      ),
      reactions(
        *,
        participant:participants(*)
      )
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })

  if (lastMessageId) {
    query = query.gt('id', lastMessageId)
  }

  const { data: messages } = await query

  return messages || []
}