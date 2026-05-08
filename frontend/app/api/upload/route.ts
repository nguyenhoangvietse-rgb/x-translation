import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.txt')) {
      return NextResponse.json(
        { error: 'Only .txt files are allowed' },
        { status: 400 }
      )
    }

    // Read file buffer
    const buffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(buffer)

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || '',
      Key: filename,
      Body: fileBuffer,
      ContentType: 'text/plain',
    })

    await s3Client.send(command)

    return NextResponse.json({
      success: true,
      filename,
      size: file.size,
      message: 'File uploaded successfully',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
