import { useEffect, useState } from 'react'
import './App.css'
import './index.css'
import { supabase } from './supabaseClient'
import DeviceCard from './components/DeviceCard'
import { useRealtimeReadings } from './hooks/useRealtimeReadings'

function AddDeviceForm({ onDeviceAdded }) {
  const [deviceId, setDeviceId] = useState('')
  const [containerName, setContainerName] = useState('')
  const [minQuantity, setMinQuantity] = useState(10)
  const [maxCapacity, setMaxCapacity] = useState(500)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!deviceId.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('devices')
        .insert({
          deviceid: deviceId.trim(),
          container_name: containerName.trim() || null,
          min_quantity_g: Number(minQuantity),
          max_capacity_g: Number(maxCapacity)
        })

      if (!error) {
        console.log('Device added successfully')
        setDeviceId('')
        setContainerName('')
        setMinQuantity(10)
        setMaxCapacity(500)
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
        className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
      >
        <div className="text-center">
          <div className="text-2xl mb-2">+</div>
          <div className="text-sm text-gray-600">Add Device</div>
        </div>
      </button>
    )
  }

  return (
    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Device ID *</label>
          <input
            type="text"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="e.g., spicebox-01"
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Container Name</label>
          <input
            type="text"
            value={containerName}
            onChange={(e) => setContainerName(e.target.value)}
            placeholder="e.g., Salt Container"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Min Quantity (g)</label>
            <input
              type="number"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              className="w-full border rounded px-3 py-2"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Capacity (g)</label>
            <input
              type="number"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              className="w-full border rounded px-3 py-2"
              min="1"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Device'}
          </button>
        </div>
      </form>
    </div>
  )
}

function App() {
  const [devices, setDevices] = useState([])
  const latestByDevice = useRealtimeReadings(devices.map((d) => d.deviceid))

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

  useEffect(() => {
    loadDevices()
  }, [])

  const cleanupStorage = async () => {
    try {
      // Get all files in device-images bucket
      const { data: files, error } = await supabase.storage.from('device-images').list('', { limit: 1000 })
      if (error) {
        console.error('Error listing files:', error)
        return
      }

      console.log('All files in storage:', files)

      // Get all device image URLs from database
      const { data: devices } = await supabase.from('devices').select('image_url')
      const validUrls = devices?.map(d => d.image_url).filter(Boolean) || []

      console.log('Valid URLs in database:', validUrls)

      // Find files that are not referenced in database
      const filesToDelete = []
      for (const file of files) {
        const filePath = file.name
        const isReferenced = validUrls.some(url => url.includes(filePath))
        if (!isReferenced) {
          filesToDelete.push(filePath)
        }
      }

      console.log('Files to delete:', filesToDelete)

      if (filesToDelete.length > 0) {
        const { data, error: deleteError } = await supabase.storage.from('device-images').remove(filesToDelete)
        console.log('Delete response:', { data, error: deleteError })

        if (deleteError) {
          console.error('Error deleting files:', deleteError)
          alert(`Error: ${deleteError.message}`)
        } else {
          console.log(`Deleted ${filesToDelete.length} orphaned files:`, filesToDelete)
          alert(`Cleaned up ${filesToDelete.length} orphaned image files`)
        }
      } else {
        alert('No orphaned files found')
      }
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Spicebox</h1>
          <div className="flex gap-2">
            <button
              onClick={cleanupStorage}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Cleanup Storage
            </button>
            <button
              onClick={async () => {
                const path = prompt('Enter file path to delete (e.g., spicebox-01/1757268348276.png):')
                if (path) {
                  const { data, error } = await supabase.storage.from('device-images').remove([path])
                  console.log('Manual delete result:', { data, error })
                  alert(error ? `Error: ${error.message}` : 'File deleted successfully')
                }
              }}
              className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
            >
              Manual Delete
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center">
          {devices.map((d) => (
            <DeviceCard key={d.deviceid} device={d} latestReading={latestByDevice[d.deviceid]} onUpdated={loadDevices} />
          ))}
          <AddDeviceForm onDeviceAdded={loadDevices} />
          {devices.length === 0 && (
            <div className="col-span-full text-center text-sm text-gray-500 py-8">
              No devices yet. Click "Add Device" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
