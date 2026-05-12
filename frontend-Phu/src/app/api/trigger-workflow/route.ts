import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileKey } = await request.json()

    if (!fileName || !fileKey) {
      return NextResponse.json(
        { error: 'fileName and fileKey are required' },
        { status: 400 }
      )
    }

    const owner = process.env.GITHUB_REPO_OWNER || 'nguyenhoangvietse-rgb'
    const repo = process.env.GITHUB_REPO_NAME || 'x-translation'
    const token = process.env.GITHUB_PAT

    if (!token) {
      console.error('GITHUB_PAT not configured')
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      )
    }

    // Trigger GitHub Action via repository_dispatch
    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'new_book_uploaded_Phu',
          client_payload: {
            fileName,
            fileKey,
            uploadedAt: new Date().toISOString(),
          },
        }),
      }
    )

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text()
      console.error('GitHub API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to trigger GitHub Action' },
        { status: githubResponse.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Translation workflow triggered successfully',
    })
  } catch (error) {
    console.error('Error triggering workflow:', error)
    return NextResponse.json(
      { error: 'Failed to trigger workflow' },
      { status: 500 }
    )
  }
}
