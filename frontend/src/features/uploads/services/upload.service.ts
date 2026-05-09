import axios from 'axios'
import axiosInstance from '@/lib/axios'

interface PresignedUrlResponse {
  url: string
  key: string
}

interface PresignedUrlRequest {
  fileName: string
  fileType: string
}

interface TriggerWorkflowRequest {
  fileName: string
  fileKey: string
}

interface TriggerWorkflowResponse {
  success: boolean
  message: string
}

export const uploadService = {
  /**
   * Get a pre-signed URL for direct R2 upload
   */
  async getPresignedUrl(data: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    const response = await axiosInstance.post<PresignedUrlResponse>(
      '/api/upload/presigned',
      data
    )
    return response.data
  },

  /**
   * Upload file directly to R2 using pre-signed URL
   */
  async uploadToR2(url: string, file: File): Promise<void> {
    await axios.put(url, file, {
      headers: {
        'Content-Type': file.type,
      },
    })
  },

  /**
   * Trigger GitHub Action workflow for translation
   */
  async triggerWorkflow(data: TriggerWorkflowRequest): Promise<TriggerWorkflowResponse> {
    const response = await axiosInstance.post<TriggerWorkflowResponse>(
      '/api/trigger-workflow',
      data
    )
    return response.data
  },

  /**
   * Complete upload flow: get presigned URL, upload to R2, and trigger workflow
   */
  async uploadFile(file: File): Promise<{ success: boolean; key: string }> {
    // Step 1: Get pre-signed URL
    const { url, key } = await this.getPresignedUrl({
      fileName: file.name,
      fileType: file.type,
    })

    // Step 2: Upload to R2
    await this.uploadToR2(url, file)

    // Step 3: Trigger GitHub Action workflow
    await this.triggerWorkflow({
      fileName: file.name,
      fileKey: key,
    })

    return { success: true, key }
  },
}
