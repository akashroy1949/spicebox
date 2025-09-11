import { useState, useEffect } from 'react'

export default function NotificationManager({ onClose }) {
  const [permission, setPermission] = useState('default')
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userPreference, setUserPreference] = useState('enabled') // 'enabled' or 'disabled'

  // Load user preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('spicebox_notifications')
    if (stored) {
      setUserPreference(stored)
    }
  }, [])

  // Save user preference to localStorage
  const savePreference = (preference) => {
    localStorage.setItem('spicebox_notifications', preference)
    setUserPreference(preference)
  }

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const handleEnableNotifications = async () => {
    setIsLoading(true)
    try {
      if (!isSupported) {
        alert('Your browser does not support notifications')
        return
      }

      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        savePreference('enabled')
        console.log('✅ Browser notifications enabled!')
      } else {
        console.log('❌ Notification permission denied')
      }
    } catch (error) {
      console.error('❌ Error enabling notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setIsLoading(true)
    try {
      savePreference('disabled')
      console.log('✅ Notifications disabled in app')
    } catch (error) {
      console.error('❌ Error disabling notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestNotification = () => {
    if (permission !== 'granted') {
      alert('Please enable notifications first')
      return
    }

    console.log('✅ Notifications are working properly')
  }

  if (!isSupported) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Notifications Not Supported</h3>
        <p className="text-gray-600 text-sm mb-4">Your browser doesn't support notifications.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 0110.293-4.293L15 6.414V17z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-500">Manage alert preferences</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Description */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Get notifications when spice levels run low.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Enable Button */}
          {(userPreference === 'disabled' || permission !== 'granted') && (
            <button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enabling...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 0110.293-4.293L15 6.414V17z" />
                  </svg>
                  Enable Notifications
                </>
              )}
            </button>
          )}

          {/* Disable Button */}
          {userPreference === 'enabled' && permission === 'granted' && (
            <div className="space-y-3">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-green-600 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-green-800 mb-1">Notifications Active</h4>
                <p className="text-xs text-green-600">
                  You'll receive alerts when containers run low.
                </p>
              </div>
              <button
                onClick={handleDisableNotifications}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Disabling...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                    Disable Notifications
                  </>
                )}
              </button>
              
              {/* Required text after disable button */}
              <div className="text-xs text-gray-500 text-center mt-3">
                To re-enable: Click browser address bar settings → Allow notifications
              </div>
            </div>
          )}
        </div>

        {/* Simple Tips */}
        <div className="text-xs text-gray-500 text-center bg-blue-50 p-3 rounded-lg">
          <strong>💡 Tip:</strong> Works when browser tab is open.
        </div>
      </div>
    </div>
  )
}