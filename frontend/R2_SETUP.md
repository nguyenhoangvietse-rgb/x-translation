# R2 Upload Setup

## Environment Variables

Create a `.env.local` file in the frontend directory with your Cloudflare R2 credentials:

```bash
cp .env.local.example .env.local
```

Then fill in your R2 configuration:

```env
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
```

## Getting R2 Credentials

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to R2 section
3. Create a bucket (if not already created)
4. Go to "Manage R2 API Tokens"
5. Create a new API token with read/write permissions
6. Copy the Access Key ID and Secret Access Key
7. Your endpoint URL format: `https://<account-id>.r2.cloudflarestorage.com`

## Features

- Upload `.txt` files to Cloudflare R2
- Drag & drop support
- File validation
- Upload progress indicator
- Success/error notifications
- Auto-clear after successful upload

## API Route

The upload endpoint is available at `/api/upload` and accepts:
- Method: POST
- Content-Type: multipart/form-data
- Field name: `file`
- File type: `.txt` only

## Usage

Visit `/upload` page and either:
- Drag and drop a .txt file
- Click to browse and select a file
- Click "Upload to R2" button
