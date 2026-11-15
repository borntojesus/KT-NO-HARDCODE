import { cn } from "./cn";

export function Card({ active }: { active: boolean }) {
  return (
    <div
      className={cn("rounded-[6px] p-[13px] bg-[#123456]", active && "text-[14px]")}
      style={{ color: "#0d8275", fontFamily: "Inter, sans-serif" }}
    >
      <svg>
        <path fill="rgb(10 20 30)" stroke="#ccc" />
      </svg>
    </div>
  );
}
