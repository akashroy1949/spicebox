
import { useState } from 'react'
import NotificationManager from './NotificationManager'

export default function Header({ hasDevices, onAddDevice }) {
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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg flex items-center justify-center p-1 shadow-lg ring-2 ring-blue-200">
                  <img src="/spicebox_logo.png" alt="Spicebox Logo" className="w-full h-full object-contain filter drop-shadow-sm" />
                </div>
                {/* Brand Name & Slogan */}
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Spicebox
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Smart Kitchen Inventory Management System</p>
                </div>
              </div>
            </div>

            {/* Right side - Add Device Button + Bell Icon */}
            <div className="flex items-center gap-2">
              {/* Add Device Button - Only show when devices exist */}
              {hasDevices && (
                <button
                  onClick={onAddDevice}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
                  title="Add New Device"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="hidden sm:inline">Add Device</span>
                </button>
              )}

              {/* Bell Icon */}
              <button
                onClick={() => setShowNotificationModal(true)}
                className="relative p-2 text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all duration-200 group shadow-md hover:shadow-lg"
                title="Notification Settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 0110.293-4.293L15 6.414V17z" />
                </svg>
                {/* Notification indicator dot */}
                <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full opacity-75 group-hover:opacity-100"></div>
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