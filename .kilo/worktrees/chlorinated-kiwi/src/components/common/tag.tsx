import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { TagTone } from './tag-tone'

export type { TagTone }

/**
 * Typed against `TagTone` rather than inferred, so the tones a chip can be
 * painted and the tones anything is allowed to ask for are one list. Adding a
 * tone without a class here, or a class here under no tone, is a type error.
 */
const TONES: Record<TagTone, string> = {
  accent: 'bg-brand-100 text-brand-800',
  neutral: 'bg-neutral-100 text-neutral-800',
  outline: 'border border-brand text-brand',
  good: 'bg-success-subtle text-success-ink',
  bad: 'bg-danger-subtle text-danger-ink',
}

const tagVariants = cva(
  'inline-flex items-center rounded-sm px-2.5 py-0.75 text-2xs tracking-[0.02em]',
  {
    variants: { variant: TONES },
    defaultVariants: { variant: 'neutral' },
  },
)

export type TagProps = React.ComponentProps<'span'> &
  VariantProps<typeof tagVariants>

/** The design system's `.tag` — a flat, square status chip. */
export function Tag({ className, variant, ...props }: TagProps) {
  return <span className={cn(tagVariants({ variant }), className)} {...props} />
}
