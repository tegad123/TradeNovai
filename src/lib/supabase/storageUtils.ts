// Supabase Storage Utilities for Course Assets
import { createClientSafe } from './browser'

const BUCKET_NAME = 'course-assets'

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  folder: 'videos' | 'screenshots' | 'attachments',
  userId: string
): Promise<UploadResult> {
  const supabase = createClientSafe()
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' }
  }

  try {
    // Create unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const path = `${userId}/${folder}/${timestamp}_${sanitizedName}`

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      const hint = `Storage bucket "${BUCKET_NAME}" not found. Create it in Supabase Storage (Bucket name must match exactly).`
      const msg = error.message?.toLowerCase?.().includes('bucket') ? `${error.message} — ${hint}` : error.message
      return { success: false, error: msg }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    return {
      success: true,
      url: publicUrl,
      path: data.path
    }
  } catch (error) {
    console.error('Upload exception:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }
  }
}

/**
 * Upload a video file for a lesson
 */
export async function uploadLessonVideo(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Validate video type
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
  if (!validTypes.includes(file.type)) {
    return { 
      success: false, 
      error: 'Invalid video format. Supported: MP4, WebM, MOV, AVI' 
    }
  }

  // Validate size (max 500MB)
  const maxSize = 500 * 1024 * 1024
  if (file.size > maxSize) {
    return { 
      success: false, 
      error: 'Video file too large. Maximum size is 500MB' 
    }
  }

  return uploadFile(file, 'videos', userId)
}

/**
 * Upload a screenshot for a trade log
 */
export async function uploadScreenshot(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Validate image type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { 
      success: false, 
      error: 'Invalid image format. Supported: JPEG, PNG, GIF, WebP' 
    }
  }

  // Validate size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { 
      success: false, 
      error: 'Image file too large. Maximum size is 10MB' 
    }
  }

  return uploadFile(file, 'screenshots', userId)
}

/**
 * Upload an attachment for a submission
 */
export async function uploadAttachment(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Validate size (max 50MB)
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    return { 
      success: false, 
      error: 'File too large. Maximum size is 50MB' 
    }
  }

  return uploadFile(file, 'attachments', userId)
}

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string): Promise<boolean> {
  const supabase = createClientSafe()
  if (!supabase) return false

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete exception:', error)
    return false
  }
}

/**
 * Get a signed URL for private files (if bucket is private)
 */
export async function getSignedUrl(
  path: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  const supabase = createClientSafe()
  if (!supabase) return null

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresInSeconds)

    if (error) {
      console.error('Signed URL error:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Signed URL exception:', error)
    return null
  }
}

