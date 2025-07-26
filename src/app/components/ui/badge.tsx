// components/ui/badge.tsx
import { cn } from "@/lib/utils/classnames";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        variant === "destructive" && "bg-destructive text-destructive-foreground",
        className
      )}
      {...props}
    />
  );
}
