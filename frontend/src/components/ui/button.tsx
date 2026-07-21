import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "shine bg-gradient-to-b from-accent to-[#2563eb] text-white shadow-[0_0_0_1px_rgba(59,130,246,.4),0_10px_28px_-8px_rgba(59,130,246,.65)] hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(59,130,246,.6),0_14px_34px_-8px_rgba(59,130,246,.8)] active:translate-y-0 active:scale-[.985]",
        gold:
          "shine bg-gradient-to-b from-gold to-gold-deep text-[#241a02] shadow-[0_0_0_1px_rgba(242,193,78,.4),0_10px_28px_-8px_rgba(242,193,78,.5)] hover:-translate-y-px active:translate-y-0",
        outline:
          "border border-line bg-card text-ink-soft hover:-translate-y-px hover:border-accent-2/40 hover:bg-surface-2 hover:text-ink active:translate-y-0",
        ghost: "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
