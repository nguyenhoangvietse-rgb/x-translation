"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { z } from "zod";
import { useAppForm } from "@/hooks/form";
import { uploadService } from "../services/upload.service";
import { Upload, FileText } from "lucide-react";

const uploadSchema = z
  .object({
    isFull: z.boolean(),
    fromChapter: z.string().optional(),
    toChapter: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.isFull) {
        if (!data.fromChapter || !data.toChapter) {
          return false;
        }
      }
      return true;
    },
    {
      message: "From and To chapters are required for partial uploads",
      path: ["fromChapter"],
    },
  );

type UploadFormData = z.infer<typeof uploadSchema>;

interface CreateUploadFormProps {
  novelId: Id<"novels">;
  onSuccess?: () => void;
}

export function CreateUploadForm({
  novelId,
  onSuccess,
}: CreateUploadFormProps) {
  const createUpload = useMutation(api.novels.createUpload);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const form = useAppForm({
    defaultValues: {
      isFull: true,
      fromChapter: "",
      toChapter: "",
    } as UploadFormData,
    validators: {
      onChange: uploadSchema,
    },
    onSubmit: async ({ value }) => {
      if (!selectedFile) {
        setError("Please select a file");
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setUploadProgress("Uploading file...");

      try {
        // Get presigned URL
        const { url, key } = await uploadService.getPresignedUrl({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        });

        // Upload file to R2
        await uploadService.uploadToR2(url, selectedFile);

        setUploadProgress("Saving to database...");

        // Save to Convex
        await createUpload({
          novelId,
          url: key,
          isFull: value.isFull,
          fromChapter: value.fromChapter
            ? Number(value.fromChapter)
            : undefined,
          toChapter: value.toChapter ? Number(value.toChapter) : undefined,
        });

        form.reset();
        setSelectedFile(null);
        setUploadProgress("");
        onSuccess?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create upload",
        );
        setUploadProgress("");
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/plain") {
        setError("Only .txt files are allowed");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== "text/plain") {
        setError("Only .txt files are allowed");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl text-foreground">Add Upload</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Upload a TXT file for this novel
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium block">
            Upload File *
          </label>
          <label
            htmlFor="file-upload"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-background/50 hover:bg-background/80 transition-all"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {selectedFile ? (
                <>
                  <FileText className="h-8 w-8 text-accent mb-2" />
                  <p className="text-sm text-foreground font-medium">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedFile(null);
                    }}
                    className="mt-2 text-xs text-destructive hover:underline"
                  >
                    Remove file
                  </button>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    TXT files only
                  </p>
                </>
              )}
            </div>
            <input
              id="file-upload"
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        <form.AppField
          name="isFull"
          children={(field) => (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Upload Type
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={field.state.value === true}
                    onChange={() => field.handleChange(true)}
                    className="w-4 h-4 text-accent"
                  />
                  <span className="text-sm text-foreground">Full Novel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={field.state.value === false}
                    onChange={() => field.handleChange(false)}
                    className="w-4 h-4 text-accent"
                  />
                  <span className="text-sm text-foreground">
                    Partial Chapters
                  </span>
                </label>
              </div>
            </div>
          )}
        />

        <form.Subscribe selector={(state) => state.values.isFull}>
          {(isFull) =>
            !isFull && (
              <div className="grid grid-cols-2 gap-4">
                <form.AppField
                  name="fromChapter"
                  children={(field) => (
                    <field.TextField
                      label="From Chapter"
                      placeholder="1"
                      type="number"
                      required
                    />
                  )}
                />
                <form.AppField
                  name="toChapter"
                  children={(field) => (
                    <field.TextField
                      label="To Chapter"
                      placeholder="10"
                      type="number"
                      required
                    />
                  )}
                />
              </div>
            )
          }
        </form.Subscribe>

        {error && (
          <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        {uploadProgress && (
          <div className="text-accent text-sm p-3 bg-accent/10 rounded-lg border border-accent/20">
            {uploadProgress}
          </div>
        )}

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isFormSubmitting]) => (
            <button
              type="submit"
              disabled={
                !selectedFile || !canSubmit || isSubmitting || isFormSubmitting
              }
              className="w-full px-6 py-3.5 rounded-lg font-medium text-primary-foreground transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: "var(--gradient-gold)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              {isSubmitting || isFormSubmitting
                ? uploadProgress || "Processing..."
                : "Add Upload"}
            </button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
