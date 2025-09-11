import { useEffect, useState } from 'react'
import './App.css'
import './index.css'
import { supabase } from './supabaseClient'
import DeviceCard from './components/DeviceCard'
import Header from './components/Header'
import { useRealtimeReadings } from './hooks/useRealtimeReadings'
import { useNotificationMonitor } from './hooks/useNotificationMonitor'

function AddDeviceForm({ onDeviceAdded, onCancel, forceModal = false }) {
  const [deviceId, setDeviceId] = useState('')
  const [containerName, setContainerName] = useState('')
  const [minQuantity, setMinQuantity] = useState(10)
  const [maxCapacity, setMaxCapacity] = useState(500)
  const [isOpen, setIsOpen] = useState(forceModal) // Start open if forceModal is true
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  // Function to reset form
  function resetForm() {
    setDeviceId('')
    setContainerName('')
    setMinQuantity(10)
    setMaxCapacity(500)
    setSelectedFile(null)
    setImagePreview(null)
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Create image preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!deviceId.trim()) return

    setLoading(true)
    try {
      let imageUrl = null

      // Upload image if a file was selected
      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop()
        const path = `${deviceId.trim()}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('device-images').upload(path, selectedFile, {
          cacheControl: '3600', upsert: true
        })
        if (upErr) {
          console.error('Upload error:', upErr)
          alert('Error uploading image: ' + upErr.message)
          return
        }
        const { data: publicUrl } = supabase.storage.from('device-images').getPublicUrl(path)
        imageUrl = publicUrl.publicUrl
      }

      const { error } = await supabase
        .from('devices')
        .insert({
          deviceid: deviceId.trim(),
          container_name: containerName.trim() || null,
          min_quantity_g: Number(minQuantity),
          max_capacity_g: Number(maxCapacity),
          image_url: imageUrl
        })

      if (!error) {
        console.log('Device added successfully')
        setDeviceId('')
        setContainerName('')
        setMinQuantity(10)
        setMaxCapacity(500)
        setSelectedFile(null)
        setImagePreview(null)
        setIsOpen(false)
        // Only refresh data after successful insert
        onDeviceAdded()
      } else {
        console.error('Error adding device:', error)
        alert('Error adding device: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 min-h-[200px] w-full flex flex-col items-center justify-center"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div className="text-lg font-semibold mb-1">Add Device</div>
          <div className="text-sm opacity-90">Connect a new spice container</div>
        </div>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-t-lg">
          <h3 className="text-lg font-bold text-white text-center">Add New Device</h3>
          <p className="text-blue-100 text-center text-sm mt-1">Connect your spice container</p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Device ID *</label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g., spicebox-01"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-200 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Container Name</label>
            <input
              type="text"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
              placeholder="e.g., Salt Container"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Min Quantity (g)</label>
              <input
                type="number"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-200 text-sm"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Max Capacity (g)</label>
              <input
                type="number"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed transition-all duration-200 text-sm"
                min="1"
                disabled
                title="This field is disabled"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Container Image</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                disabled={loading}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-200 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 text-sm"
              />

              {/* Image Preview - Right side of file input */}
              {imagePreview && (
                <div className="relative flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-md border-2 border-gray-200"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null)
                      setSelectedFile(null)
                      const fileInput = document.querySelector('input[type="file"]')
                      if (fileInput) fileInput.value = ''
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors duration-200"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsOpen(false)
                onCancel && onCancel()
              }}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold transition-all duration-200 text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md hover:from-blue-600 hover:to-purple-700 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-2">Adding...</span>
                </div>
              ) : (
                'Add Device'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [devices, setDevices] = useState([])
  const [showAddDeviceForm, setShowAddDeviceForm] = useState(false)
  const latestByDevice = useRealtimeReadings(devices.map((d) => d.deviceid))

  // Monitor for low weight notifications
  useNotificationMonitor(devices, latestByDevice)

  const loadDevices = async () => {
    const { data, error } = await supabase
      .from('devices')
      .select('deviceid, container_name, min_quantity_g, max_capacity_g, image_url')
      .order('created_at', { ascending: false })
    if (!error && data) {
      console.log('Devices loaded:', data)
      setDevices(data)
    } else {
      console.error('Error loading devices:', error)
    }
  }

  const handleAddDevice = () => {
    setShowAddDeviceForm(true)
  }

  const handleDeviceAdded = () => {
    setShowAddDeviceForm(false)
    loadDevices()
  }

  useEffect(() => {
    loadDevices()
  }, [])


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with Notification Bell and Add Device Button */}
      <Header hasDevices={devices.length > 0} onAddDevice={handleAddDevice} />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Devices Grid */}
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {devices.map((d) => (
            <DeviceCard key={d.deviceid} device={d} latestReading={latestByDevice[d.deviceid]} onUpdated={loadDevices} />
          ))}
        </div>

        {/* Modal AddDeviceForm - Show when any button is clicked */}
        {showAddDeviceForm && (
          <AddDeviceForm
            onDeviceAdded={handleDeviceAdded}
            onCancel={() => setShowAddDeviceForm(false)}
            forceModal={true}
          />
        )}

        {/* Empty State - Only show when no devices and no add form is showing */}
        {devices.length === 0 && !showAddDeviceForm && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No devices yet</h3>
              <p className="text-gray-600 mb-6">Get started by adding your first spice container</p>
              <button
                onClick={handleAddDevice}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Add Your First Device
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
