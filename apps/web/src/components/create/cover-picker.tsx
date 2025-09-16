import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CoverPicker({
  coverUrl,
  presets,
  onPickUrl,
  onPickUpload,
}: {
  coverUrl: string;
  presets: string[];
  onPickUrl: (url: string) => void;
  onPickUpload: () => void;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ImageIcon className="size-4" /> Change cover
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-4xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border bg-background shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <DialogPrimitive.Title className="text-foreground text-sm font-semibold">
                Choose Image
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="rounded-xs p-1 opacity-70 transition-opacity hover:opacity-100">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div
                role="button"
                tabIndex={0}
                onClick={onPickUpload}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onPickUpload();
                }}
                className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center"
              >
                <div className="text-sm font-medium">
                  Drag & drop or click here to upload.
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Or choose an image below. The ideal aspect ratio is 1:1.
                </div>
              </div>

              <div className="mt-4">
                <Input
                  placeholder="Search for more photos"
                  className="w-full"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {presets.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onPickUrl(url)}
                    className={cn(
                      "relative aspect-[16/10] w-full overflow-hidden rounded-md border",
                      coverUrl === url ? "ring-2 ring-primary" : ""
                    )}
                    aria-label={`Choose cover image`}
                  >
                    <img
                      src={url}
                      alt="Preset image"
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-2 text-left text-xs font-medium text-white">
                      Preset
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default CoverPicker;
