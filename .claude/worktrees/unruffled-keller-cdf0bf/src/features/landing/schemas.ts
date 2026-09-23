import { z } from 'zod'

/**
 * The walkthrough request.
 *
 * Only the address is held to a shape, and deliberately: the school's name and
 * its size are what the call is about, but a lead with no way back is the one
 * that cannot be answered at all.
 */
export const walkthroughSchema = z.object({
  school: z.string().trim(),
  email: z
    .string()
    .trim()
    .regex(/.+@.+\..+/, 'Enter a work email we can reply to.'),
  size: z.string(),
})

export type WalkthroughValues = z.infer<typeof walkthroughSchema>
