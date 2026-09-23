import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { FormProvider } from 'react-hook-form'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page/page-header'
import { Panel } from '@/components/page/panel'
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
  blocked,
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
  /** Why the form cannot be saved right now. See `FormFooter`. */
  blocked?: string
  children: ReactNode
}) {
  const errorCount = Object.keys(form.formState.errors).length

  return (
    <div className="mx-auto w-full max-w-[980px]">
      {back}

      <Panel className="mt-3 p-5 sm:p-8">
        <PageHeader kicker={kicker} title={title} description={description} />

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-7">
            <FormErrorBanner count={errorCount} />
            {children}
            <Rule />
            {blocked && (
              <p className="mb-3.5 rounded-lg bg-ui-field px-4 py-3.5 text-sm">
                {blocked}
              </p>
            )}
            <FormFooter
              submitLabel={submitLabel}
              onCancel={onCancel}
              deleteLabel={deleteLabel}
              onDelete={onDelete}
              pending={form.formState.isSubmitting}
              blocked={blocked}
            />
          </form>
        </FormProvider>
      </Panel>
    </div>
  )
}
