import { supabase } from './supabase'

export interface Chatroom {
  id: string
  host_id: string
  link: string
  expires_at: string
  created_at: string
}

export interface User {
  id: string
  chatroom_id: string
  nickname: string
  joined_at: string
}

export interface Message {
  id: string
  chatroom_id: string
  user_id: string
  message_text?: string
  media_url?: string
  is_viewed: boolean
  created_at: string
  user?: User
}

export interface MediaFile {
  id: string
  message_id: string
  file_url: string
  file_type: 'image' | 'video'
  is_viewed: boolean
  created_at: string
}

// Generate a UUID for browser compatibility
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Create a new chatroom
export async function createChatroom(): Promise<{ chatroom: Chatroom; link: string }> {
  const hostId = generateUUID()
  const link = generateRoomLink()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

  const { data, error } = await supabase
    .from('chatrooms')
    .insert({
      host_id: hostId,
      link,
      expires_at: expiresAt
    })
    .select()
    .single()

  if (error) throw error

  return { chatroom: data, link }
}

// Generate a unique room link
function generateRoomLink(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Join a chatroom with nickname
export async function joinChatroom(link: string, nickname: string): Promise<{ user: User; chatroom: Chatroom }> {
  // First, find the chatroom
  const { data: chatroom, error: chatroomError } = await supabase
    .from('chatrooms')
    .select('*')
    .eq('link', link)
    .single()

  if (chatroomError) throw chatroomError

  // Check if expired
  if (new Date(chatroom.expires_at) < new Date()) {
    throw new Error('Chatroom has expired')
  }

  // Check if nickname is unique in the room
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('chatroom_id', chatroom.id)
    .eq('nickname', nickname)
    .single()

  if (existingUser) {
    throw new Error('Nickname already taken')
  }

  // Create user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      chatroom_id: chatroom.id,
      nickname
    })
    .select()
    .single()

  if (userError) throw userError

  return { user, chatroom }
}

// Send a message
export async function sendMessage(chatroomId: string, userId: string, messageText?: string, file?: File): Promise<Message> {
  let mediaUrl: string | undefined

  // First, create the message
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      chatroom_id: chatroomId,
      user_id: userId,
      message_text: messageText
    })
    .select()
    .single()

  if (messageError) throw messageError

  // If file, upload and update message
  if (file) {
    const mediaFile = await uploadMedia(file, chatroomId, message.id)
    mediaUrl = mediaFile.file_url

    // Update message with media_url
    const { error: updateError } = await supabase
      .from('messages')
      .update({ media_url: mediaUrl })
      .eq('id', message.id)

    if (updateError) throw updateError

    message.media_url = mediaUrl
  }

  // Fetch with user
  const { data: fullMessage, error: fetchError } = await supabase
    .from('messages')
    .select(`
      *,
      user:users(*)
    `)
    .eq('id', message.id)
    .single()

  if (fetchError) throw fetchError

  return fullMessage
}

// Get messages for a chatroom
export async function getMessages(chatroomId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      user:users(*)
    `)
    .eq('chatroom_id', chatroomId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return data
}

// Upload media to Supabase Storage
export async function uploadMedia(file: File, chatroomId: string, messageId: string): Promise<MediaFile> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${generateUUID()}.${fileExt}`
  const filePath = `media/${chatroomId}/${fileName}`

  const { error } = await supabase.storage
    .from('media')
    .upload(filePath, file)

  if (error) throw error

  const { data } = supabase.storage
    .from('media')
    .getPublicUrl(filePath)

  // Create media_files record
  const { data: mediaFile, error: mediaError } = await supabase
    .from('media_files')
    .insert({
      message_id: messageId,
      file_url: data.publicUrl,
      file_type: file.type.startsWith('image/') ? 'image' : 'video'
    })
    .select()
    .single()

  if (mediaError) throw mediaError

  return mediaFile
}

// Mark media as viewed and delete
export async function markMediaViewed(mediaId: string): Promise<void> {
  // First, get the media file
  const { data: media, error: fetchError } = await supabase
    .from('media_files')
    .select('*')
    .eq('id', mediaId)
    .single()

  if (fetchError) throw fetchError

  // Mark as viewed
  const { error: updateError } = await supabase
    .from('media_files')
    .update({ is_viewed: true })
    .eq('id', mediaId)

  if (updateError) throw updateError

  // Extract file path from URL
  const url = new URL(media.file_url)
  const filePath = url.pathname.split('/').slice(-2).join('/') // media/chatroomId/filename

  // Delete from storage
  await supabase.storage
    .from('media')
    .remove([filePath])
}

// Get chatroom by link
export async function getChatroomByLink(link: string): Promise<Chatroom> {
  const { data, error } = await supabase
    .from('chatrooms')
    .select('*')
    .eq('link', link)
    .single()

  if (error) throw error

  return data
}

// Subscribe to messages in a chatroom
export function subscribeToMessages(chatroomId: string, callback: (message: Message) => void) {
  const channel = supabase
    .channel(`messages:${chatroomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chatroom_id=eq.${chatroomId}`
      },
      async (payload) => {
        // Fetch the full message with user
        const { data: message, error } = await supabase
          .from('messages')
          .select(`
            *,
            user:users(*)
          `)
          .eq('id', payload.new.id)
          .single()

        if (!error && message) {
          callback(message)
        }
      }
    )
    .subscribe()

  return channel
}