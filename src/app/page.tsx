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
    // Check if user has a profile set up
    const profile = getUserProfile()
    setUserProfile(profile)
    setIsLoading(false)
  }, [])

  // Show profile setup for first-time users
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-4xl animate-spin">💫</div>
      </div>
    )
  }

  if (!userProfile) {
    return <ProfileSetup onComplete={setUserProfile} />
  }

  // Main app interface
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Main Content */}
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

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
    </div>
  )
}
