import { useEffect, useRef, useCallback } from 'react'

export function useNotificationMonitor(devices, latestReadings) {
  const lastNotificationTimeRef = useRef({})
  const lastProcessedReadingRef = useRef({})
  const processingRef = useRef(false)

  const sendLowWeightNotification = useCallback(async (device, currentWeight, minQuantity) => {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('❌ Browser notifications not supported')
        return
      }

      // Check user preference from localStorage
      const userPreference = localStorage.getItem('spicebox_notifications')
      if (userPreference === 'disabled') {
        console.log('🔕 Notifications disabled by user preference')
        return
      }

      // Check if we have permission
      if (Notification.permission !== 'granted') {
        console.log('❌ Notification permission not granted')
        return
      }

      const containerName = device.container_name || 'Unnamed Container'

      // Create browser notification (works when tab is open)
      const notification = new Notification(
        `⚠️ Low Spice Alert: ${containerName}`,
        {
          body: `${containerName} is running low! Current: ${currentWeight}g, Minimum: ${minQuantity}g`,
          icon: device.image_url || '/vite.svg',
          badge: '/vite.svg',
          vibrate: [200, 100, 200, 100, 200],
          requireInteraction: true,
          silent: false,
          tag: `spicebox-${device.deviceid}` // Prevents duplicate notifications
        }
      )

      // Handle notification click
      notification.onclick = () => {
        window.focus()
        notification.close()
        console.log('🔔 Notification clicked for device:', device.deviceid)
      }

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close()
      }, 10000)

      console.log(`✅ Low weight notification sent for ${containerName}`)

    } catch (error) {
      console.error('❌ Error sending low weight notification:', error)
    }
  }, [])

  useEffect(() => {
    if (!devices.length) {
      console.log('🔍 Notification monitor: No devices to monitor')
      return
    }

    if (processingRef.current) {
      console.log('🔄 Notification monitor: Already processing, skipping...')
      return
    }

    processingRef.current = true

    console.log('🔍 Notification monitor: Checking devices for low weight alerts')
    console.log('📊 Current readings:', Object.keys(latestReadings).length, 'devices with readings')

    // Check each device for low weight conditions
    devices.forEach((device) => {
      const reading = latestReadings[device.deviceid]

      if (!reading) {
        console.log(`📭 No reading available for device: ${device.deviceid}`)
        return
      }

      const currentWeight = reading.weight_g
      const minQuantity = device.min_quantity_g || 10
      const deviceId = device.deviceid
      const containerName = device.container_name || 'Unnamed Container'

      console.log(`📊 Device ${deviceId} (${containerName}): Current=${currentWeight}g, Min=${minQuantity}g`)

      // Check if weight reading has actually changed since last check
      const lastProcessedReading = lastProcessedReadingRef.current[deviceId]
      const weightChanged = !lastProcessedReading || lastProcessedReading.weight_g !== currentWeight

      console.log(`📊 Device ${deviceId} weight change check: Last=${lastProcessedReading?.weight_g || 'none'}, Current=${currentWeight}, Changed=${weightChanged}`)

      // Only process notifications if weight has actually changed
      if (weightChanged) {
        // Check if weight is below minimum
        const isLow = currentWeight < minQuantity

        if (isLow) {
          // Check if enough time has passed since last notification (short cooldown to prevent spam)
          const lastNotification = lastNotificationTimeRef.current[deviceId]
          const now = Date.now()
          const timeSinceLastNotification = lastNotification ? now - lastNotification : Infinity

          console.log(`⏰ Time since last notification for ${deviceId}: ${Math.round(timeSinceLastNotification / 1000)}s`)

          // Send notification for low weight reading (with 5-second cooldown)
          if (timeSinceLastNotification > 5 * 1000) {
            console.log(`🚨 SENDING NOTIFICATION for ${containerName} - LOW WEIGHT ALERT! Weight: ${currentWeight}g`)
            sendLowWeightNotification(device, currentWeight, minQuantity)
            lastNotificationTimeRef.current[deviceId] = now
          } else {
            console.log(`⏳ Skipping notification for ${deviceId} - cooldown active (${Math.round((5 * 1000 - timeSinceLastNotification) / 1000)}s remaining)`)
          }
        } else {
          // Weight is normal - clear any cooldown tracking
          if (lastNotificationTimeRef.current[deviceId]) {
            console.log(`✅ Device ${deviceId} back to normal weight`)
            delete lastNotificationTimeRef.current[deviceId]
          }
        }
      } else {
        console.log(`📊 Device ${deviceId} weight unchanged, skipping notification check`)
      }

      // Update last processed reading (for UI updates, not notification logic)
      lastProcessedReadingRef.current[deviceId] = { ...reading }
    })

    processingRef.current = false
  }, [devices, latestReadings, sendLowWeightNotification])


  // Function to reset notification state (useful for testing)
  const resetNotifications = () => {
    lastNotificationTimeRef.current = {}
  }

  return { resetNotifications }
}