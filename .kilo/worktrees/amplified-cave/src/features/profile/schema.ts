import { z } from 'zod'
import { MINIMUM_SCORE, passwordScore } from '../auth/password.ts'
import { schemaFromSections } from '../collections/schema.ts'
import type { ProfileField } from './types.ts'

/** Every editable field the form holds; the locked ones never reach it. */
export function profileSchema(fields: ProfileField[]) {
  return schemaFromSections([
    {
      title: 'Personal details',
      fields: fields.filter((field) => !field.locked),
    },
  ])
}

export const changePasswordSchema = z
  .object({
    current: z.string().trim().min(1, 'Required'),
    next: z
      .string()
      .refine(
        (value) => passwordScore(value) >= MINIMUM_SCORE,
        'This password is not strong enough yet',
      ),
    repeat: z.string(),
  })
  .refine((values) => values.next === values.repeat, {
    path: ['repeat'],
    message: 'The two passwords do not match',
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
