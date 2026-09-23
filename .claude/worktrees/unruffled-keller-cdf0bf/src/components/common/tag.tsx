import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const tagVariants = cva(
  'inline-flex items-center rounded-sm px-2.5 py-0.75 text-2xs tracking-[0.02em]',
  {
    variants: {
      variant: {
        accent: 'bg-brand-100 text-brand-800',
        neutral: 'bg-neutral-100 text-neutral-800',
        outline: 'border border-brand text-brand',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export type TagProps = React.ComponentProps<'span'> &
  VariantProps<typeof tagVariants>

/** The design system's `.tag` — a flat, square status chip. */
export function Tag({ className, variant, ...props }: TagProps) {
  return <span className={cn(tagVariants({ variant }), className)} {...props} />
}
