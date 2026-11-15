import { cn } from "./cn";

export function Card({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md p-4 bg-card text-card-foreground",
        "data-[state=open]:bg-accent [&>svg]:size-4 max-[600px]:hidden",
        "w-[var(--sidebar-width)] h-[calc(100vh-var(--header-height))] bg-(--brand)",
        active && "ring-2 ring-ring",
      )}
      style={{ color: "var(--fg)", fontFamily: "var(--font-sans)" }}
    >
      <a href="#about" id="#top">About</a>
      <svg>
        <path fill="currentColor" stroke="var(--border)" />
      </svg>
    </div>
  );
}
