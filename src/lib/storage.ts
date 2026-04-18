import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'

export async function uploadPhoto(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

/** Delete a photo by its full download URL or storage path. Silently ignores if not found. */
export async function deletePhoto(urlOrPath: string): Promise<void> {
  try {
    // If it's a full Firebase Storage URL, extract the path
    let storageRef
    if (urlOrPath.startsWith('https://firebasestorage.googleapis.com') || urlOrPath.startsWith('https://storage.googleapis.com')) {
      storageRef = ref(storage, urlOrPath)
    } else {
      storageRef = ref(storage, urlOrPath)
    }
    await deleteObject(storageRef)
  } catch (err: unknown) {
    // Ignore "object not found" errors
    if (err && typeof err === 'object' && 'code' in err && err.code === 'storage/object-not-found') return
    console.warn('deletePhoto failed:', err)
  }
}

export function compressImage(file: File, maxWidth = 800): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')

    img.onload = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file) // Fallback to original if no context
        return
      }

      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file) // Fallback to original
            return
          }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.8,
      )
      URL.revokeObjectURL(img.src)
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('图片加载失败'))
    }

    img.src = URL.createObjectURL(file)
  })
}
