import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
    const { fileName, fileType } = await request.json()

    if (!fileName) {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (fileType !== 'text/plain') {
      return NextResponse.json(
        { error: 'Only .txt files are allowed' },
        { status: 400 }
      )
    }

    // Generate unique file name with timestamp
    const timestamp = Date.now()
    const uniqueFileName = `phu-test/${timestamp}-${fileName}`

    // Create the PutObject command
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: fileType,
    })

    // Generate pre-signed URL (expires in 5 minutes)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })

    console.log('Generated presigned URL for key:', uniqueFileName)

    return NextResponse.json({
      url: presignedUrl,
      key: uniqueFileName,
    })
  } catch (error) {
    console.error('Error generating pre-signed URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
