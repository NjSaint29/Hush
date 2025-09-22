
'use client'

import { useState, useEffect } from 'react'
import { ProfileSetup } from '@/components/ProfileSetup'
import { BottomNavigation } from '@/components/BottomNavigation'
import { ChatsScreen } from '@/components/screens/ChatsScreen'
import { CreateScreen } from '@/components/screens/CreateScreen'
import { SettingsScreen } from '@/components/screens/SettingsScreen'
import { getUserProfile } from '@/lib/supabase'

export default function Home() {
  const [userProfile, setUserProfile] = useState<{ nickname: string; avatar: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'chats' | 'create' | 'settings'>('chats')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const profile = getUserProfile()
    setUserProfile(profile)
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-4xl animate-spin text-primary">💫</div>
      </div>
    )
  }

  if (!userProfile) {
    return <ProfileSetup onComplete={setUserProfile} />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 pb-20 overflow-hidden">
        {activeTab === 'chats' && <ChatsScreen />}
        {activeTab === 'create' && <CreateScreen />}
        {activeTab === 'settings' && (
          <SettingsScreen 
            userProfile={userProfile}
            onProfileUpdate={setUserProfile}
          />
        )}
      </div>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
    </div>
  )
}
