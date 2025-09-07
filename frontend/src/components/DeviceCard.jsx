import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function DeviceCard({ device, latestReading, onUpdated }) {
  const [open, setOpen] = useState(false)
  const [containerName, setContainerName] = useState(device.container_name || '')
  const [minQty, setMinQty] = useState(device.min_quantity_g ?? 10)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  const current = latestReading?.weight_g ?? null
  const maxCap = device.max_capacity_g ?? 500
  const used = current != null ? Math.max(0, maxCap - Number(current)) : null
  const low = current != null ? Number(current) <= Number(minQty) : false

  async function handleSave(e) {
    e.preventDefault()
    setUploading(true)

    try {
      let imageUrl = device.image_url

      // Upload image if a new file was selected
      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop()
        const path = `${device.deviceid}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('device-images').upload(path, selectedFile, {
          cacheControl: '3600', upsert: true
        })
        if (upErr) {
          console.error('Upload error:', upErr)
          return
        }
        const { data: publicUrl } = supabase.storage.from('device-images').getPublicUrl(path)
        imageUrl = publicUrl.publicUrl

        // Delete old image if it exists
        if (device.image_url) {
          try {
            console.log('Current device image URL:', device.image_url)

            // Try multiple URL parsing methods
            let oldPath = null

            // Method 1: Split by device-images/
            if (device.image_url.includes('/device-images/')) {
              const urlParts = device.image_url.split('/device-images/')
              if (urlParts.length > 1) {
                oldPath = urlParts[1]
                console.log('Method 1 - Extracted path:', oldPath)
              }
            }

            // Method 2: Split by storage/v1/object/public/device-images/
            if (!oldPath && device.image_url.includes('/storage/v1/object/public/device-images/')) {
              const urlParts = device.image_url.split('/storage/v1/object/public/device-images/')
              if (urlParts.length > 1) {
                oldPath = urlParts[1]
                console.log('Method 2 - Extracted path:', oldPath)
              }
            }

            if (oldPath) {
              console.log('Attempting to delete old image with path:', oldPath)

              // Try to delete the file
              const { data, error: deleteErr } = await supabase.storage.from('device-images').remove([oldPath])
              console.log('Delete response:', { data, error: deleteErr })

              if (deleteErr) {
                console.warn('Delete error:', deleteErr)
                // Try alternative approach - check if file exists first
                const { data: fileList } = await supabase.storage.from('device-images').list('', { search: oldPath })
                console.log('File exists check:', fileList)

                if (fileList && fileList.length > 0) {
                  console.log('File still exists, trying direct delete...')
                  // Try deleting with full path
                  const { error: directDeleteErr } = await supabase.storage.from('device-images').remove([oldPath])
                  console.log('Direct delete result:', directDeleteErr)
                }
              } else {
                console.log('Old image successfully deleted:', oldPath)
              }
            } else {
              console.warn('Could not extract file path from URL:', device.image_url)
            }
          } catch (deleteErr) {
            console.warn('Could not delete old image:', deleteErr)
            // Don't fail the whole operation if old image deletion fails
          }
        }
      }

      // Update device with all data
      const { error } = await supabase
        .from('devices')
        .upsert({
          deviceid: device.deviceid,
          container_name: containerName,
          min_quantity_g: Number(minQty),
          image_url: imageUrl
        })

      if (!error) {
        console.log('Device updated successfully')
        // Only refresh data after successful update
        onUpdated?.()
        setOpen(false)
        setSelectedFile(null)
      } else {
        console.error('Error updating device:', error)
        alert('Error updating device: ' + error.message)
      }
    } finally {
      setUploading(false)
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  return (
    <div className={`flex gap-4 rounded-lg border p-4 shadow-sm bg-white ${low ? 'ring-2 ring-red-400' : ''}`}>
      <div className="h-24 w-24 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
        {device.image_url ? (
          <img
            key={device.image_url}
            src={`${device.image_url}?t=${Date.now()}`}
            alt="container"
            className="h-full w-full object-cover"
            onError={(e) => {
              console.log('Image failed to load:', device.image_url)
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', device.image_url)
            }}
          />
        ) : null}
        <div className="text-xs text-gray-500" style={{ display: device.image_url ? 'none' : 'flex' }}>
          image
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <div className={`text-sm ${device.container_name ? '' : 'italic text-gray-500'}`}>
              {device.container_name || 'Enter your container name'}
            </div>
            <div className="text-xs text-gray-500">Device: {device.deviceid}</div>
          </div>
          <button onClick={() => setOpen(true)} className="h-8 w-8 rounded hover:bg-gray-100 flex items-center justify-center">⋯</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>Max Capacity - {maxCap}g</div>
          <div>Min Quantity - {minQty}g</div>
          <div className="col-span-2">Current - {current != null ? `${Number(current).toFixed(0)}g` : '—'}</div>
          <div className="col-span-2">Used - {used != null ? `${Math.round(used)}g` : '—'}</div>
        </div>
        {low && <div className="mt-2 text-xs text-red-600">Below minimum quantity</div>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-lg p-4 w-full max-w-md space-y-3">
            <div className="text-lg font-medium">Edit Device</div>
            <div className="space-y-1">
              <label className="text-sm">Container name</label>
              <input value={containerName} onChange={(e) => setContainerName(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="Enter your container name" />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Min quantity (g)</label>
              <input type="number" value={minQty} onChange={(e) => setMinQty(e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Image</label>
              <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
              {selectedFile && (
                <div className="text-xs text-green-600">
                  Selected: {selectedFile.name}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 rounded border">Cancel</button>
              <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}


