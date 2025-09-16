import { cn } from "@/lib/utils";

export function CoverBanner({ url }: { url: string }) {
  const bgStyle = {
    backgroundImage: `url(${url})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as const;
  return (
    <div className="relative w-full overflow-hidden rounded-xl border">
      <div className={cn("aspect-[16/5] w-full")} style={bgStyle} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
    </div>
  );
}

export default CoverBanner;
