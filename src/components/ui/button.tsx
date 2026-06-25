/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Aurora-flavoured Button. The visual language (gradient signature action, glass
 * outline, iOS press) maps onto the existing design tokens rather than shadcn's
 * neutral defaults, so it drops in without disturbing the brand.
 */
const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ios-button select-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-background))] disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // The brand signature action — apply / export. `.btn-aurora` carries the
        // three-stop gradient and a gentle hover pan; the inset highlight gives it
        // glossy iOS matter, the coloured shadow lets it float over the backdrop.
        default:
          'btn-aurora text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45),inset_0_0_0_1px_rgba(255,255,255,0.12),0_10px_24px_-12px_rgba(var(--aurora-violet),0.65),0_14px_34px_-16px_rgba(var(--aurora-pink),0.7)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),inset_0_0_0_1px_rgba(255,255,255,0.16),0_14px_30px_-12px_rgba(var(--aurora-violet),0.7),0_20px_44px_-16px_rgba(var(--aurora-pink),0.85)]',
        // Focal transport control (play / pause) — the Aurora orb. The brand
        // gradient now lives on the action you take all night long, not on export.
        // Glossy inner highlight + a deep coloured glow seat it in the dream field.
        play:
          'btn-aurora text-white shadow-[inset_0_1.5px_0_0_rgba(255,255,255,0.55),inset_0_0_0_1px_rgba(255,255,255,0.2),0_4px_10px_-2px_rgba(13,9,31,0.45),0_12px_30px_-8px_rgba(var(--aurora-pink),0.6)] hover:shadow-[inset_0_1.5px_0_0_rgba(255,255,255,0.6),inset_0_0_0_1px_rgba(255,255,255,0.26),0_4px_10px_-2px_rgba(13,9,31,0.45),0_16px_40px_-8px_rgba(var(--aurora-pink),0.78)]',
        // High-contrast solid — generic inverse surface.
        inverse:
          'bg-[rgb(var(--color-text))] text-[rgb(var(--color-background))] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_10px_24px_-10px_rgba(var(--color-text),0.45)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.32),0_16px_34px_-10px_rgba(var(--color-accent),0.6)]',
        // Selected / active affordance — accent tint with a soft halo that deepens
        // on hover so even a chosen mode stays responsive to the pointer.
        accent:
          'border border-[rgba(var(--color-accent),0.5)] bg-[rgba(var(--color-accent),0.12)] text-[rgb(var(--color-accent))] shadow-[0_10px_30px_-22px_rgba(var(--color-accent),0.9)] hover:border-[rgba(var(--color-accent),0.7)] hover:bg-[rgba(var(--color-accent),0.18)]',
        // Neutral chrome — icon controls, secondary actions. Hover lifts an accent
        // wash in (the old brightness-only hover read as dead on transparent fills).
        outline:
          'border border-[rgba(var(--color-border),0.7)] text-[rgb(var(--color-text))] hover:border-[rgba(var(--color-accent),0.5)] hover:bg-[rgba(var(--color-accent),0.07)]',
        secondary:
          'border border-[rgba(var(--color-border),0.6)] bg-[rgba(var(--color-surface),0.5)] text-[rgb(var(--color-text))] hover:border-[rgba(var(--color-accent),0.45)] hover:bg-[rgba(var(--color-surface),0.9)]',
        ghost: 'text-[rgb(var(--color-text))] hover:bg-[rgba(var(--color-border),0.3)]',
        // Quiet committing action (export). A dark glass pill that recedes into the
        // transport; identity comes from an Aurora-tinted icon, not a loud fill.
        // Hover warms the border to Aurora and firms the surface.
        glass:
          'border border-[rgba(var(--color-border),0.85)] bg-[rgba(var(--color-surface),0.6)] text-[rgb(var(--color-text))] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_10px_26px_-18px_rgba(0,0,0,0.7)] hover:border-[rgba(var(--aurora-violet),0.6)] hover:bg-[rgba(var(--color-surface),0.88)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_30px_-16px_rgba(var(--aurora-violet),0.5)]',
        // Disabled / unavailable surface (no opacity dimming — flat muted fill).
        muted: 'bg-[rgba(var(--color-border),0.5)] text-[rgb(var(--color-text-secondary))]',
      },
      size: {
        sm: 'h-9 px-3 text-sm rounded-full',
        default: 'h-11 px-5 text-[15px] rounded-full',
        lg: 'h-[52px] px-6 text-[15px] rounded-[14px]',
        pill: 'h-12 px-6 text-[15px] rounded-full',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
