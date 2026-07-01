/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'px-3 py-1 border border-[rgba(var(--color-border),0.6)] bg-[rgba(var(--color-surface),0.5)] text-[rgb(var(--color-text-secondary))]',
        accent:
          'px-3 py-1 border border-[rgba(var(--color-accent),0.4)] bg-[rgba(var(--color-accent),0.1)] text-[rgb(var(--color-accent-text))]',
        ghost: 'text-[rgb(var(--color-text-secondary))]',
        /* HUD chip - a small glass pill with the holographic hairline, for text
           that floats directly over the ambient scene (welcome-stage effect
           chips). Enough fill + blur to stay legible over a bright photo. */
        hud: 'px-3.5 py-1.5 border border-[rgba(var(--hud-line),0.32)] bg-[rgba(var(--color-surface),0.5)] backdrop-blur-md text-[rgb(var(--color-text))] shadow-[0_10px_30px_-20px_rgba(var(--hud-glow),0.6)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
