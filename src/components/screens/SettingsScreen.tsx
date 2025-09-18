'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AvatarPicker } from '@/components/ui/AvatarPicker'
import { Modal } from '@/components/ui/Modal'
import { saveUserProfile } from '@/lib/supabase'

interface SettingsScreenProps {
  userProfile: { nickname: string; avatar: string }
  onProfileUpdate: (profile: { nickname: string; avatar: string }) => void
}

export function SettingsScreen({ userProfile, onProfileUpdate }: SettingsScreenProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [nickname, setNickname] = useState(userProfile.nickname)
  const [avatar, setAvatar] = useState(userProfile.avatar)
  const [showLogout, setShowLogout] = useState(false)

  const handleSave = () => {
    if (!nickname.trim()) return

    const updatedProfile = { nickname: nickname.trim(), avatar }
    saveUserProfile(updatedProfile.nickname, updatedProfile.avatar)
    onProfileUpdate(updatedProfile)
    setIsEditing(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('hush_user_profile')
    localStorage.removeItem('hush_device_id')
    window.location.reload()
  }

  const handleCancel = () => {
    setNickname(userProfile.nickname)
    setAvatar(userProfile.avatar)
    setIsEditing(false)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center">
          <span className="mr-3">⚙️</span>
          Settings
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your anonymous profile
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Profile Section */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100">Profile</h2>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="secondary" size="sm">
                  Edit
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="text-center">
                  <AvatarPicker
                    value={avatar}
                    onChange={setAvatar}
                  />
                </div>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Nickname"
                  maxLength={20}
                />
                <div className="flex space-x-3">
                  <Button onClick={handleSave} size="sm" className="flex-1">
                    Save
                  </Button>
                  <Button onClick={handleCancel} variant="secondary" size="sm" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 text-2xl bg-gray-800 rounded-full flex items-center justify-center">
                  {userProfile.avatar}
                </div>
                <div>
                  <p className="font-medium text-gray-100">{userProfile.nickname}</p>
                  <p className="text-sm text-gray-400">Anonymous user</p>
                </div>
              </div>
            )}
          </div>

          {/* App Info */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">About Hush</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center space-x-3">
                <span className="text-lg">🕒</span>
                <span>Chat rooms last exactly 24 hours</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-lg">🔒</span>
                <span>All messages disappear forever</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-lg">🎭</span>
                <span>Stay completely anonymous</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-lg">📱</span>
                <span>No registration or login required</span>
              </div>
            </div>
          </div>

          {/* App Version */}
          <div className="text-center text-sm text-gray-500">
            <p>Hush v1.0.0</p>
            <p>Built with ❤️ for privacy</p>
          </div>

          {/* Logout */}
          <Button
            onClick={() => setShowLogout(true)}
            variant="danger"
            className="w-full"
          >
            Clear Profile & Sign Out
          </Button>
        </div>
      </div>

      {/* Logout Confirmation */}
      <Modal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        title="Clear Profile?"
      >
        <div className="space-y-4 text-center">
          <p className="text-gray-400">
            This will remove your profile from this device and you'll need to set up a new one.
          </p>
          <p className="text-gray-400">
            You won't be able to access your current chat rooms.
          </p>
          <div className="flex space-x-3 pt-4">
            <Button onClick={handleLogout} variant="danger" className="flex-1">
              Clear Profile
            </Button>
            <Button onClick={() => setShowLogout(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}