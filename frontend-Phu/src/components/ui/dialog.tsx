"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onOpenChange(false);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;

      if (!isInDialog) {
        onOpenChange(false);
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("click", handleClick);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("click", handleClick);
    };
  }, [onOpenChange]);

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/60 bg-transparent p-0 max-w-2xl w-full rounded-xl border-0 shadow-2xl m-auto"
    >
      <div className="relative bg-card/95 backdrop-blur-xl rounded-xl border border-border">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </dialog>
  );
}

interface DialogTriggerProps {
  children: React.ReactNode;
  onClick: () => void;
}

export function DialogTrigger({ children, onClick }: DialogTriggerProps) {
  return <button onClick={onClick}>{children}</button>;
}

interface DialogContentProps {
  children: React.ReactNode;
}

export function DialogContent({ children }: DialogContentProps) {
  return <div className="p-8">{children}</div>;
}
