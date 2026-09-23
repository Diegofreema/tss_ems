import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { FormProvider } from 'react-hook-form'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { FormErrorBanner } from './form-error-banner'
import { FormFooter } from './form-footer'

/**
 * The create/edit page shell. Validation runs on submit only — never on
 * keystroke — so pass a form created with `useRecordForm`.
 */
export function RecordForm<TValues extends FieldValues>({
  form,
  back,
  kicker,
  title,
  description,
  submitLabel,
  onSubmit,
  onCancel,
  deleteLabel,
  onDelete,
  children,
}: {
  form: UseFormReturn<TValues>
  /**
   * The way out, above the heading. Cancel at the foot of a long form is a
   * scroll away from where someone realises they are on the wrong record.
   */
  back?: ReactNode
  kicker: string
  title: string
  description?: string
  submitLabel: string
  onSubmit: (values: TValues) => void | Promise<void>
  onCancel: () => void
  deleteLabel?: string
  onDelete?: () => void
  children: ReactNode
}) {
  const errorCount = Object.keys(form.formState.errors).length

  return (
    <div className="max-w-[780px]">
      {back}
      <PageHeader kicker={kicker} title={title} description={description} />
      <Rule />

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormErrorBanner count={errorCount} />
          {children}
          <Rule />
          <FormFooter
            submitLabel={submitLabel}
            onCancel={onCancel}
            deleteLabel={deleteLabel}
            onDelete={onDelete}
            pending={form.formState.isSubmitting}
          />
        </form>
      </FormProvider>
    </div>
  )
}
