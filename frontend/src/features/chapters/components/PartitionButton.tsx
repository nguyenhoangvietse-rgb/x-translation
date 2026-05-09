import { Split } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PartitionButton({ novelId }: { novelId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startChapter, setStartChapter] = useState("");
  const [endChapter, setEndChapter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePartition = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chapters/partition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          novelId,
          startChapter: parseInt(startChapter),
          endChapter: parseInt(endChapter),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to partition chapters");
        return;
      }

      // Success - close dialog and reset form
      setIsDialogOpen(false);
      setStartChapter("");
      setEndChapter("");
      
      // TODO: Show success notification or refresh data
      console.log("Partition successful:", data);
    } catch (err) {
      setError("An error occurred while partitioning chapters");
      console.error("Partition error:", err);
    } finally {
      setIsLoading(false);
    }
  };

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
        <Split className="h-4 w-4" />
        Partition Chapters
      </button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Partition Chapters
              </h2>
              <p className="text-sm text-muted-foreground">
                Select the range of chapters you want to split into smaller
                parts.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="startChapter"
                  className="text-xs uppercase tracking-widest text-muted-foreground font-medium block"
                >
                  Start Chapter *
                </label>
                <input
                  id="startChapter"
                  type="number"
                  min="1"
                  value={startChapter}
                  onChange={(e) => setStartChapter(e.target.value)}
                  placeholder="e.g., 1"
                  className="w-full px-4 py-3 bg-background/50 border border-border rounded-[6px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="endChapter"
                  className="text-xs uppercase tracking-widest text-muted-foreground font-medium block"
                >
                  End Chapter *
                </label>
                <input
                  id="endChapter"
                  type="number"
                  min="1"
                  value={endChapter}
                  onChange={(e) => setEndChapter(e.target.value)}
                  placeholder="e.g., 10"
                  className="w-full px-4 py-3 bg-background/50 border border-border rounded-[6px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handlePartition}
                disabled={
                  !startChapter ||
                  !endChapter ||
                  parseInt(startChapter) > parseInt(endChapter) ||
                  isLoading
                }
              >
                {isLoading ? "Partitioning..." : "Partition"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
