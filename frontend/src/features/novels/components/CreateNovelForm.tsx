"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { z } from "zod";
import { useAppForm } from "@/hooks/form";

const novelSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  originalTitle: z.string().max(200, "Original title is too long").optional(),
  coverPhoto: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  author: z.string().max(100, "Author name is too long").optional(),
  description: z.string().max(1000, "Description is too long").optional(),
});

type NovelFormData = z.infer<typeof novelSchema>;

interface CreateNovelFormProps {
  onSuccess?: () => void;
}

export function CreateNovelForm({ onSuccess }: CreateNovelFormProps = {}) {
  const createNovel = useMutation(api.novels.create);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: {
      title: "",
      originalTitle: "",
      coverPhoto: "",
      author: "",
      description: "",
    } as NovelFormData,
    validators: {
      onChange: novelSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      setError(null);

      try {
        await createNovel({
          title: value.title.trim().toLowerCase(),
          originalTitle: value.originalTitle || undefined,
          coverPhoto: value.coverPhoto || undefined,
          author: value.author || undefined,
          description: value.description || undefined,
        });

        // Reset form
        form.reset();
        
        // Call onSuccess callback if provided
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create novel");
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl text-foreground">
          Create new novel
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Add a new novel to your library
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
        <form.AppField
          name="title"
          children={(field) => (
            <field.TextField
              label="Title (Vietnamese)"
              placeholder="Enter Vietnamese title"
              required
            />
          )}
        />

        <form.AppField
          name="originalTitle"
          children={(field) => (
            <field.TextField
              label="Original Title (Chinese)"
              placeholder="Enter original Chinese title"
            />
          )}
        />

        <form.AppField
          name="coverPhoto"
          children={(field) => (
            <field.TextField
              label="Cover Photo URL"
              placeholder="https://example.com/cover.jpg"
            />
          )}
        />

        <form.AppField
          name="author"
          children={(field) => (
            <field.TextField label="Author" placeholder="Enter author name" />
          )}
        />

        <form.AppField
          name="description"
          children={(field) => (
            <field.TextArea
              label="Description"
              placeholder="Enter novel description"
              rows={4}
            />
          )}
        />

        {error && (
          <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isFormSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting || isFormSubmitting}
              className="w-full px-6 py-3.5 rounded-lg font-medium text-primary-foreground transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: "var(--gradient-gold)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              {isSubmitting || isFormSubmitting
                ? "Creating..."
                : "Create novel"}
            </button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
