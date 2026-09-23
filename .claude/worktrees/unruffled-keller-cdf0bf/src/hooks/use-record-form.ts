import { zodResolver } from '@hookform/resolvers/zod'
import { type DefaultValues, type FieldValues, useForm } from 'react-hook-form'
import type { ZodType } from 'zod'

/**
 * Every record form in the design validates on submit and re-validates on
 * submit — never on keystroke. Centralised here so no form can drift.
 */
export function useRecordForm<TValues extends FieldValues>(
  schema: ZodType<TValues, TValues>,
  defaultValues: DefaultValues<TValues>,
) {
  return useForm<TValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  })
}
