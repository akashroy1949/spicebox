import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import Gauge from './Gauge'
import { validateWeight } from '../lib/utils'

export default function DeviceCard({ device, latestReading, onUpdated }) {
  const [open, setOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [containerName, setContainerName] = useState(device.container_name || '')
  const [minQty, setMinQty] = useState(device.min_quantity_g ?? 10)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const dropdownRef = useRef(null)

  // Function to reset form to original device values
  function resetForm() {
    setContainerName(device.container_name || '')
    setMinQty(device.min_quantity_g ?? 10)
    setSelectedFile(null)
    setImagePreview(null)
  }

  const current = latestReading?.weight_g ?? null
  const maxCap = device.max_capacity_g ?? 500
  
  // Validate and clamp the current weight
  const validatedWeight = current != null ? validateWeight(current, maxCap) : null
  const low = validatedWeight != null ? validatedWeight <= Number(device.min_quantity_g ?? 10) : false

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showDropdown])

  // Reset form when edit modal opens
  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open])

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
        setImagePreview(null)
      } else {
        console.error('Error updating device:', error)
        alert('Error updating device: ' + error.message)
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      // Step 1: Delete all images from storage related to this device
      try {
        console.log('Deleting all images for device:', device.deviceid)

        // List all files in the device-images bucket
        const { data: files, error: listError } = await supabase.storage
          .from('device-images')
          .list('', { limit: 1000 })

        if (listError) {
          console.warn('Error listing storage files:', listError)
        } else if (files) {
          // Filter files that belong to this device (start with deviceid/)
          const deviceFiles = files.filter(file =>
            file.name.startsWith(`${device.deviceid}/`)
          )

          if (deviceFiles.length > 0) {
            console.log('Found device files to delete:', deviceFiles.map(f => f.name))

            // Delete all device-related files
            const { error: deleteFilesError } = await supabase.storage
              .from('device-images')
              .remove(deviceFiles.map(f => f.name))

            if (deleteFilesError) {
              console.warn('Error deleting device images from storage:', deleteFilesError)
            } else {
              console.log(`Successfully deleted ${deviceFiles.length} images from storage`)
            }
          } else {
            console.log('No device-specific images found in storage')
          }
        }
      } catch (storageErr) {
        console.warn('Error during storage cleanup:', storageErr)
        // Continue with database deletion even if storage cleanup fails
      }

      // Step 2: Delete from readings table first (due to foreign key constraint)
      console.log('Deleting readings for device:', device.deviceid)
      const { error: readingsError } = await supabase
        .from('readings')
        .delete()
        .eq('deviceid', device.deviceid)

      if (readingsError) {
        console.warn('Error deleting readings:', readingsError)
        // Continue with device deletion even if readings deletion fails
      } else {
        console.log('Successfully deleted readings')
      }

      // Step 3: Delete from devices table
      console.log('Deleting device:', device.deviceid)
      const { error: deviceError } = await supabase
        .from('devices')
        .delete()
        .eq('deviceid', device.deviceid)

      if (deviceError) {
        console.error('Error deleting device:', deviceError)
        alert('Error deleting device: ' + deviceError.message)
        return
      }

      console.log('Device and all related data deleted successfully')
      setShowDeleteModal(false)
      onUpdated?.()
    } catch (err) {
      console.error('Delete error:', err)
      alert('Error deleting device: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

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

  return (
    <div className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${low ? 'ring-2 ring-red-400 shadow-red-100' : 'hover:shadow-blue-100'}`}>
      {/* Background gradient for low quantity */}
      {low && (
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 opacity-50"></div>
      )}

      <div className="relative p-4 sm:p-6">
        {/* Header with image and menu */}
        <div className="flex items-start gap-3 sm:gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex items-center justify-center shadow-sm">
              {device.image_url ? (
                <img
                  key={device.image_url}
                  src={`${device.image_url}?t=${Date.now()}`}
                  alt={device?.image_url.split('/').pop().split('.')[0] || 'container'}
                  className="w-full h-full object-cover"
                  onError={() => {
                    console.log('Image failed to load:', device.image_url)
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', device.image_url)
                  }}
                />
              ) : (
                <div className="text-xs text-gray-500 font-medium">No Image</div>
              )}
            </div>
            {/* Status indicator */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white ${validatedWeight != null ? (low ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-400'}`}></div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className={`font-semibold text-gray-900 truncate text-sm sm:text-base ${device.container_name ? '' : 'italic text-gray-500'}`}>
                  {device.container_name || 'Unnamed Container'}
                </h3>
                <p className="text-xs text-gray-500 mt-1 font-mono truncate">{device.deviceid}</p>
              </div>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="ml-2 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 opacity-100"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowDropdown(false)
                          setOpen(true)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Device
                      </button>
                      <button
                        onClick={() => {
                          setShowDropdown(false)
                          setShowDeleteModal(true)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Device
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gauge Component */}
        <div className="mb-4">
          <Gauge value={validatedWeight || 0} max={maxCap} />
        </div>

        {/* Weight Information */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Max Capacity</div>
              <div className="text-base sm:text-lg font-bold text-gray-900">{maxCap}g</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Min Quantity</div>
              <div className="text-base sm:text-lg font-bold text-gray-900">{device.min_quantity_g ?? 10}g</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 sm:p-4">
            <div className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">Current Quantity</div>
            <div className={`text-xl sm:text-2xl font-bold ${validatedWeight != null ? (low ? 'text-red-600' : 'text-green-600') : 'text-gray-400'}`}>
              {validatedWeight != null ? `${Number(validatedWeight)}g` : '—'}
            </div>
          </div>
        </div>

        {/* Low quantity warning */}
        {low && (
          <div className="mt-3 sm:mt-4 bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-xs sm:text-sm font-medium text-red-800">Below minimum quantity</span>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 transform transition-all duration-300 scale-100">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-t-2xl">
              <h3 className="text-lg font-bold text-white text-center">Edit Device</h3>
              <p className="text-blue-100 text-center text-xs mt-1">Update container settings</p>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Container Name</label>
                <input
                  value={containerName}
                  onChange={(e) => setContainerName(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm"
                  placeholder="Enter your container name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Min Quantity (g)</label>
                <input
                  type="number"
                  value={minQty}
                  onChange={(e) => setMinQty(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Container Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  disabled={uploading}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-sm"
                />

                {/* Image Preview - Only show selected image */}
                {imagePreview && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Image Preview:</p>
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null)
                          setSelectedFile(null)
                          // Reset the file input
                          const fileInput = document.querySelector('input[type="file"]')
                          if (fileInput) fileInput.value = ''
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors duration-200"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {selectedFile && !imagePreview && (
                  <div className="mt-2 text-xs text-green-600 font-medium">
                    ✓ Selected: {selectedFile.name}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    setOpen(false)
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-200 text-sm"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="ml-1">Saving...</span>
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300 scale-100">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 sm:p-6 rounded-t-2xl">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white text-center">Delete Device</h3>
              <p className="text-red-100 text-center text-xs sm:text-sm mt-1">This action cannot be undone</p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-2">
                  Are you sure you want to delete <strong>"{device.container_name || 'this device'}"</strong>?
                </p>
                <p className="text-sm text-gray-500 mb-1">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-gray-500 text-left max-w-xs mx-auto">
                  <li>• The device from the database</li>
                  <li>• All weight readings history</li>
                  <li>• All related images from storage</li>
                </ul>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-200 text-sm sm:text-base"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  disabled={deleting}
                >
                  {deleting ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="ml-1">Deleting...</span>
                    </div>
                  ) : (
                    'Delete Device'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


