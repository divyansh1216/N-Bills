// Cloudinary unsigned browser uploads. No CORS setup, no bucket provisioning.
// Requires in .env.local:
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your cloud name>
//   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<an unsigned upload preset>

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

function uploadToCloudinary(
  file: File,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(
        new Error(
          'Cloudinary not configured — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local'
        )
      )
      return
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    if (folder) formData.append('folder', folder)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText)
          onProgress?.(100)
          resolve(res.secure_url as string)
        } catch {
          reject(new Error('Invalid response from Cloudinary'))
        }
      } else {
        let msg = `Upload failed (${xhr.status})`
        try {
          msg = JSON.parse(xhr.responseText)?.error?.message || msg
        } catch {
          /* keep default */
        }
        reject(new Error(msg))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(formData)
  })
}

export async function uploadInventoryImage(
  file: File,
  itemId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return uploadToCloudinary(file, `nbills/inventory/${itemId}`, onProgress)
}

export async function uploadMeasurementImage(
  file: File,
  customerId: string,
  measurementId: string,
  slot: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return uploadToCloudinary(file, `nbills/measurements/${customerId}/${measurementId}/${slot}`, onProgress)
}
