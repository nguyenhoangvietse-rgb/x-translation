"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Upload, FileText, X } from "lucide-react"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === "text/plain") {
      setFile(droppedFile)
    } else {
      alert("Please upload a .txt file")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/plain") {
      setFile(selectedFile)
    } else {
      alert("Please upload a .txt file")
    }
  }

  const handleRemove = () => {
    setFile(null)
    setUploadStatus({ type: null, message: '' })
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUploadStatus({
          type: 'success',
          message: `File "${file.name}" uploaded successfully!`,
        })
        // Optional: Clear file after successful upload
        setTimeout(() => {
          setFile(null)
          setUploadStatus({ type: null, message: '' })
        }, 3000)
      } else {
        setUploadStatus({
          type: 'error',
          message: data.error || 'Failed to upload file',
        })
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'An error occurred while uploading the file',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Upload Text File</CardTitle>
          <CardDescription>
            Upload a .txt file to process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!file ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="file-upload"
                    className="text-base font-medium cursor-pointer"
                  >
                    <span className="text-primary hover:underline">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Text files (.txt) only
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-10 w-10 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemove}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {file && (
            <div className="space-y-4">
              <Button 
                onClick={handleUpload} 
                className="w-full" 
                size="lg"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload to R2
                  </>
                )}
              </Button>

              {uploadStatus.type && (
                <div
                  className={`rounded-lg p-4 text-sm ${
                    uploadStatus.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {uploadStatus.message}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
