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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageUtils.ts:uploadFile:start',message:'storage upload start',data:{bucket:BUCKET_NAME,folder,hasUserId:!!userId,fileType:file.type,fileSize:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'storage-upload-v1',hypothesisId:'H7'})}).catch(()=>{});
    // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageUtils.ts:uploadFile:error',message:'storage upload error',data:{bucket:BUCKET_NAME,path,message:error.message,name:(error as any).name||null,statusCode:(error as any).statusCode||null},timestamp:Date.now(),sessionId:'debug-session',runId:'storage-upload-v1',hypothesisId:'H7'})}).catch(()=>{});
      // #endregion
      console.error('Upload error:', error)
      const hint = `Storage bucket "${BUCKET_NAME}" not found. Create it in Supabase Storage (Bucket name must match exactly).`
      const msg = error.message?.toLowerCase?.().includes('bucket') ? `${error.message} — ${hint}` : error.message
      return { success: false, error: msg }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageUtils.ts:uploadFile:success',message:'storage upload success',data:{bucket:BUCKET_NAME,path:data.path,hasPublicUrl:!!publicUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'storage-upload-v1',hypothesisId:'H7'})}).catch(()=>{});
    // #endregion

    return {
      success: true,
      url: publicUrl,
      path: data.path
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1603b341-3958-42a0-b77e-ccce80da52ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageUtils.ts:uploadFile:exception',message:'storage upload exception',data:{bucket:BUCKET_NAME,error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'storage-upload-v1',hypothesisId:'H7'})}).catch(()=>{});
    // #endregion
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

