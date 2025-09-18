'use client'

import { ReactNode } from 'react'

interface TabProps {
  id: string
  label: string
  icon: ReactNode
  isActive: boolean
  onClick: () => void
}

function Tab({ label, icon, isActive, onClick }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-3 min-h-[68px]
        transition-all duration-200 active:scale-95
        ${isActive 
          ? 'text-teal-400' 
          : 'text-gray-500 hover:text-gray-300'
        }
      `}
    >
      <div className={`text-xl mb-1 ${isActive ? 'animate-pulse' : ''}`}>
        {icon}
      </div>
      <span className="text-xs font-medium">
        {label}
      </span>
    </button>
  )
}

interface BottomNavigationProps {
  activeTab: 'chats' | 'create' | 'settings'
  onTabChange: (tab: 'chats' | 'create' | 'settings') => void
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    {
      id: 'chats',
      label: 'Chats',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      id: 'create',
      label: 'Create',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 safe-area-inset-bottom">
      <div className="flex">
        {tabs.map((tab) => (
          <div key={tab.id} className="flex-1">
            <Tab
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={activeTab === tab.id}
              onClick={() => onTabChange(tab.id as any)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}