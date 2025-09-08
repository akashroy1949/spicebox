
import { useState } from 'react'
import NotificationManager from './NotificationManager'

export default function Header() {
  const [showNotificationModal, setShowNotificationModal] = useState(false)

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            {/* Left side - Logo, Brand, Slogan */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {/* Logo */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                {/* Brand Name & Slogan */}
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Spicebox
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Smart Kitchen Inventory</p>
                </div>
              </div>
            </div>

            {/* Right side - Bell Icon */}
            <div className="flex items-center">
              <button
                onClick={() => setShowNotificationModal(true)}
                className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                title="Notification Settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 0110.293-4.293L15 6.414V17z" />
                </svg>
                {/* Notification indicator dot */}
                <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full opacity-75 group-hover:opacity-100"></div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300 scale-100">
            <NotificationManager onClose={() => setShowNotificationModal(false)} />
          </div>
        </div>
      )}
    </>
  )
}