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

      // First, guide user to enable in browser settings
      const userAgent = navigator.userAgent.toLowerCase()
      let settingsUrl = ''

      if (userAgent.includes('chrome') || userAgent.includes('chromium')) {
        settingsUrl = 'chrome://settings/content/notifications'
      } else if (userAgent.includes('firefox')) {
        settingsUrl = 'about:preferences#privacy'
      } else if (userAgent.includes('safari')) {
        settingsUrl = 'x-apple.systempreferences:com.apple.preference.notifications'
      }

      if (settingsUrl) {
        window.open(settingsUrl, '_blank')
      }

      // Show guidance notification
      new Notification('🔧 Enable Notifications in Browser', {
        body: 'Desktop: Click lock icon in address bar → Allow notifications\nMobile: Tap address bar → Site settings → Notifications → Allow\nThen refresh page',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'spicebox-enable-guide',
        requireInteraction: true
      })

      // Request permission after showing guidance
      setTimeout(async () => {
        const result = await Notification.requestPermission()
        setPermission(result)

        if (result === 'granted') {
          savePreference('enabled')
          console.log('✅ Browser notifications enabled!')

          // Show success notification
          const successNotification = new Notification('✅ Spicebox Notifications Enabled!', {
            body: 'You will now receive alerts when spice containers run low.\n\nTo disable later:\nDesktop: Click lock icon → Block notifications\nMobile: Site settings → Notifications → Block',
            icon: '/vite.svg',
            badge: '/vite.svg',
            tag: 'spicebox-enabled'
          })

          // Auto-close after 4 seconds
          setTimeout(() => {
            successNotification.close()
          }, 4000)
        } else {
          console.log('❌ Notification permission denied')
        }
      }, 2000) // Give user time to see the guidance

    } catch (error) {
      console.error('❌ Error enabling notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setIsLoading(true)
    try {
      // Save user preference to disable notifications
      savePreference('disabled')

      console.log('✅ Notifications disabled in app')

      // Show confirmation that notifications are disabled
      new Notification('✅ Notifications Disabled', {
        body: 'To re-enable later:\nDesktop: Click lock icon in address bar → Allow notifications\nMobile: Site settings → Notifications → Allow\nThen refresh page',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'spicebox-disabled-confirm',
        requireInteraction: true
      })

      // Optional: Try to open browser settings for complete disabling
      setTimeout(() => {
        const userAgent = navigator.userAgent.toLowerCase()
        let settingsUrl = ''

        if (userAgent.includes('chrome') || userAgent.includes('chromium')) {
          settingsUrl = 'chrome://settings/content/notifications'
        } else if (userAgent.includes('firefox')) {
          settingsUrl = 'about:preferences#privacy'
        } else if (userAgent.includes('safari')) {
          settingsUrl = 'x-apple.systempreferences:com.apple.preference.notifications'
        }

        if (settingsUrl) {
          try {
            window.open(settingsUrl, '_blank')
          } catch (error) {
            console.log('Could not open settings directly:', error.message)
          }
        }
      }, 2000) // Delay to let the confirmation notification show first

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

    const testNotification = new Notification('🧪 Test Notification', {
      body: 'This is a test notification from Spicebox!',
      icon: '/vite.svg',
      badge: '/vite.svg',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      tag: 'spicebox-test'
    })

    // Auto-close after 3 seconds
    setTimeout(() => {
      testNotification.close()
    }, 3000)

    console.log('✅ Test notification sent')
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
            <h3 className="text-lg font-bold text-gray-900">Browser Notifications</h3>
            <p className="text-sm text-gray-500">Manage your alert preferences</p>
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
        {/* Status */}
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            userPreference === 'enabled'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {userPreference === 'enabled' ? '🔔 Enabled' : '🚫 Disabled'}
          </div>
          <div className="text-xs text-gray-500">
            Browser permission: {
              permission === 'granted' ? '✅ Granted' :
              permission === 'denied' ? '❌ Denied' :
              '⏳ Default'
            }
          </div>
        </div>

        {/* Description */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Get instant notifications when spice containers run low while the app is open.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {userPreference === 'disabled' && (
            <div className="space-y-3">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-blue-600 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-blue-800 mb-1">Notifications are Disabled</h4>
                <p className="text-xs text-blue-600 mb-3">
                  <strong>To re-enable:</strong><br/>
                  Desktop: Click lock icon in address bar → Allow notifications<br/>
                  Mobile: Tap address bar → Site settings → Notifications → Allow<br/>
                  Then refresh the page
                </p>
                <button
                  onClick={handleEnableNotifications}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? 'Enabling...' : 'Re-enable Notifications'}
                </button>
              </div>
            </div>
          )}

          {userPreference === 'enabled' && permission === 'default' && (
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
                  Setting up...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 0110.293-4.293L15 6.414V17z" />
                  </svg>
                  Setup Browser Notifications
                </>
              )}
            </button>
          )}

          {userPreference === 'enabled' && permission === 'granted' && (
            <div className="space-y-2">
              <button
                onClick={handleTestNotification}
                className="w-full px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Test Notification
              </button>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Disable Notifications
                  </>
                )}
              </button>
            </div>
          )}

          {userPreference === 'enabled' && permission === 'denied' && (
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-red-500 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-red-800 mb-1">Notifications Blocked</h4>
              <p className="text-xs text-red-600 mb-3">
                <strong>To re-enable:</strong><br/>
                Desktop: Click lock icon in address bar → Allow notifications<br/>
                Mobile: Tap address bar → Site settings → Notifications → Allow<br/>
                Then refresh the page
              </p>
              <button
                onClick={handleEnableNotifications}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 text-center bg-blue-50 p-3 rounded-lg">
          <strong>💡 Tip:</strong> Notifications only work when this browser tab is open.<br/>
          <strong>To disable:</strong> Desktop - Click lock icon in address bar → Block notifications<br/>
          <strong>Mobile - Tap address bar → Site settings → Notifications → Block</strong>
        </div>
      </div>
    </div>
  )
}