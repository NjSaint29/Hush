import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Room {
  id: string
  name: string
  emoji: string
  admin_id: string
  room_code: string
  created_at: string
  expires_at: string
  is_active: boolean
}

export interface Participant {
  id: string
  room_id: string
  device_id: string
  nickname: string
  avatar: string
  is_admin: boolean
  joined_at: string
  last_seen: string
}

export interface Message {
  id: string
  room_id: string
  participant_id: string
  content: string | null
  message_type: 'text' | 'image' | 'video' | 'system'
  media_url: string | null
  is_view_once: boolean
  reply_to_id: string | null
  created_at: string
  participant?: Participant
  reply_to?: Message
  reactions?: Reaction[]
}

export interface Reaction {
  id: string
  message_id: string
  participant_id: string
  emoji: string
  created_at: string
  participant?: Participant
}

// Generate device ID for anonymous users
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  
  let deviceId = localStorage.getItem('hush_device_id')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('hush_device_id', deviceId)
  }
  return deviceId
}

// Get user profile from local storage
export function getUserProfile() {
  if (typeof window === 'undefined') return null
  
  const profile = localStorage.getItem('hush_user_profile')
  return profile ? JSON.parse(profile) : null
}

// Save user profile to local storage
export function saveUserProfile(nickname: string, avatar: string) {
  if (typeof window === 'undefined') return
  
  const profile = { nickname, avatar }
  localStorage.setItem('hush_user_profile', JSON.stringify(profile))
  return profile
}