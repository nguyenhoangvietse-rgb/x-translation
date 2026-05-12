# GitHub Workflow Trigger Setup

This guide explains how to configure GitHub Actions to automatically trigger translation workflows when files are uploaded.

## Overview

When a `.txt` file is uploaded to R2, the system automatically triggers a GitHub Action workflow that processes and translates the content.

## Workflow File

The GitHub Actions workflow is defined in `.github/workflows/translate.yml` and triggers on:
- `repository_dispatch` event with type `new_book_uploaded`
- Manual `workflow_dispatch`

## Setup GitHub Personal Access Token (PAT)

### 1. Create a GitHub PAT

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name: `x-translation-workflow-trigger`
4. Set expiration (recommended: 90 days or No expiration)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
     - Required to trigger repository_dispatch events
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again!)

### 2. Add to Environment Variables

Add the following to your `.env.local` file in the `frontend` directory:

```env
# GitHub Configuration for Workflow Trigger
GITHUB_PAT=ghp_your_token_here
GITHUB_REPO_OWNER=nguyenhoangvietse-rgb
GITHUB_REPO_NAME=x-translation
```

### 3. For Production (Vercel/Other Platforms)

Add these as environment variables in your deployment platform:
- `GITHUB_PAT`
- `GITHUB_REPO_OWNER` (optional, defaults to nguyenhoangvietse-rgb)
- `GITHUB_REPO_NAME` (optional, defaults to x-translation)

## How It Works

1. User uploads a `.txt` file via the web interface
2. File is uploaded directly to Cloudflare R2 using pre-signed URLs
3. After successful upload, the backend calls GitHub API to trigger `repository_dispatch`
4. GitHub Actions workflow receives the event with payload:
   ```json
   {
     "fileName": "example.txt",
     "fileKey": "1234567890-example.txt",
     "uploadedAt": "2026-05-09T10:30:00.000Z"
   }
   ```
5. Workflow runs the translation script which:
   - Downloads the file from R2
   - Processes/translates the content
   - Uploads results back to R2

## Testing

### Test Manually via API

```bash
curl -X POST http://localhost:3000/api/trigger-workflow \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.txt", "fileKey": "123-test.txt"}'
```

### Test via GitHub UI

1. Go to your repository on GitHub
2. Navigate to Actions tab
3. Select "Auto Translate Agent" workflow
4. Click "Run workflow" button
5. Enter parameters (if any) and run

## Troubleshooting

### Workflow not triggering
- Check GitHub PAT has `repo` scope
- Verify PAT hasn't expired
- Check environment variable is set correctly
- View backend logs for API errors

### Workflow fails
- Check GitHub Actions logs in repository
- Verify all secrets are set in repository settings
- Ensure R2 credentials are configured in GitHub Secrets

## Security Notes

⚠️ **Never commit your GitHub PAT to version control**
- PAT should only be in `.env.local` (which is gitignored)
- Use environment variables in production
- Rotate tokens periodically
- Use minimum required scope (repo scope for private repos)
