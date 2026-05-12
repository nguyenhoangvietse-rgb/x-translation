"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreateUploadForm } from "./CreateUploadForm";

interface UploadButtonProps {
  novelId: Id<"novels">;
}

export function UploadButton({ novelId }: UploadButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className="px-4 py-2 rounded-lg font-medium text-sm text-primary-foreground transition-all hover:scale-[1.02] flex items-center gap-2"
        style={{
          background: "var(--gradient-gold)",
          boxShadow: "var(--shadow-glow)",
        }}
      >
        <Upload className="h-4 w-4" />
        Add Upload
      </button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <CreateUploadForm
            key={isDialogOpen ? "open" : "closed"}
            novelId={novelId}
            onSuccess={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
