import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { FormProvider } from 'react-hook-form'
import { toast } from 'sonner'
import { BackLink } from '@/components/page/back-link'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { DateField } from '@/components/form/date-field'
import { MoneyField } from '@/components/form/money-field'
import { RemoteSelectField } from '@/components/form/remote-select-field'
import {
  SearchSelectField,
  UrlSearchSelectField,
} from '@/components/form/search-select-field'
import { SelectField } from '@/components/form/select-field'
import { toOptions } from '@/features/collections/options'
import { TextField } from '@/components/form/text-field'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { Button } from '@/components/ui/button'
import { schemaFromSections } from '@/features/collections/schema'
import type { CollectionDef } from '@/features/collections/types'
import { useConfirm } from '@/hooks/use-confirm'
import { useRecordForm } from '@/hooks/use-record-form'
import { formatNaira } from '@/lib/format'
import { z } from 'zod'

import { PickerList } from './picker-list'
import { billing } from './total'
import type { ActionDef, ActionField } from './types'

type Values = Record<string, unknown>

/**
 * The editor is a large dependency and most flows are a figure and a date, so
 * it is fetched only by a flow that actually asks for prose.
 */
const RichTextField = lazy(() =>
  import('@/components/form/rich-text-field').then((module) => ({
    // Bound to this form's value shape here: `lazy` cannot carry a generic
    // through, so the type argument is applied at the import instead.
    default: module.RichTextField<Values>,
  })),
)

/**
 * The students the API would not move, and what it said about each. Shaped like
 * the form's own error banner, since it is the same kind of news.
 */
function NotMoved({ failures }: { failures: string[] }) {
  return (
    <div
      role="alert"
      className="mb-6 flex animate-ems-up gap-3 rounded-lg border border-danger/50 bg-danger-subtle px-4 py-3.5"
    >
      <CircleAlert className="mt-px size-4.5 flex-none text-danger-ink" strokeWidth={2.2} />
      <div>
        <div className="font-heading text-sm font-extrabold">
          {failures.length === 1
            ? 'One student was not moved'
            : `${failures.length} students were not moved`}
        </div>
        <ul className="mt-0.75 space-y-0.5 text-sm text-muted-foreground">
          {failures.map((failure) => (
            <li key={failure}>{failure}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function schemaFor(action: ActionDef) {
  const picks = action.picker?.requiredMessage
    ? z.array(z.string()).min(1, action.picker.requiredMessage)
    : z.array(z.string())
  const schema = schemaFromSections([
    { title: action.title, fields: action.fields },
  ]).extend({ picks })

  // A field only some answers need. Checked here rather than on the field, so
  // declining an application is not held up asking which class to put them in.
  const conditional = action.fields.filter((field) => field.requiredWhen)
  if (conditional.length === 0) return schema

  return schema.superRefine((values: Values, ctx) => {
    for (const field of conditional) {
      const when = field.requiredWhen!
      if (values[when.field] !== when.is) continue
      if (String(values[field.key] ?? '').trim()) continue
      ctx.addIssue({
        code: 'custom',
        path: [field.key],
        message: `Required to ${when.is.toLowerCase()}`,
      })
    }
  })
}

function defaultsFor(action: ActionDef): Values {
  const values: Values = { picks: action.picker?.preselected ?? [] }
  for (const field of action.fields) {
    values[field.key] = field.value ?? (field.options?.[0] ?? '')
  }
  return values
}

function renderField(field: ActionField) {
  const shared = {
    name: field.key,
    label: field.label,
    hint: field.hint,
    required: field.required,
    span: field.wide ? (2 as const) : undefined,
  }
  if (field.money)
    return <MoneyField<Values> key={field.key} {...shared} placeholder={field.placeholder} />
  if (field.date) return <DateField<Values> key={field.key} {...shared} />
  // The same branch a record form has, for the same reason: a flow that sends
  // somebody prose asks for it in the editor, not in a textarea. Lazy, so a
  // flow that asks for a figure never fetches it.
  if (field.rich)
    return (
      <Suspense
        key={field.key}
        fallback={<div className="col-[1/-1] h-60 animate-ems-fade rounded-lg border border-input" />}
      >
        <RichTextField {...shared} span={2} placeholder={field.placeholder} />
      </Suspense>
    )
  if (field.searchFrom) {
    const searched = {
      ...shared,
      from: field.searchFrom,
      placeholder: field.placeholder,
    }
    // Two components rather than a flag on one: the hook that keeps the term
    // in the URL cannot be called conditionally. See `search-select-field.tsx`.
    return field.searchParam ? (
      <UrlSearchSelectField<Values>
        key={field.key}
        {...searched}
        param={field.searchParam}
      />
    ) : (
      <SearchSelectField<Values> key={field.key} {...searched} />
    )
  }
  if (field.optionsFrom)
    return (
      <RemoteSelectField<Values>
        key={field.key}
        {...shared}
        from={field.optionsFrom}
        dependsOn={field.dependsOn}
      />
    )
  if (field.options)
    return <SelectField<Values> key={field.key} {...shared} options={toOptions(field.options)} />
  return (
    <TextField<Values>
      key={field.key}
      {...shared}
      placeholder={field.placeholder}
      multiline={field.multiline}
      type={field.number ? 'number' : 'text'}
      min={field.min}
      max={field.max}
    />
  )
}

/**
 * The guided flows: allocating a fee, taking a payment, promoting students,
 * reviewing an application, issuing a book. One page — they differ only in
 * what they summarise, what they ask to be picked and what they ask for.
 */
export function ActionPage({
  definition,
  action,
}: {
  definition: CollectionDef
  action: ActionDef
}) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const [failures, setFailures] = useState<string[]>([])
  const form = useRecordForm<Values>(schemaFor(action), defaultsFor(action))
  const picked = (form.watch('picks') as string[] | undefined) ?? []
  // Watched rather than read once: the payment flow's figures move as the
  // discount is typed.
  const answers = form.watch()

  const back = () => navigate({ to: definition.path })

  const flow = useMutation({
    mutationFn: (values: Values) => action.run!(values),
    // No `meta`: the message is the count the API came back with, which a
    // fixed string cannot say. A refusal is still announced by the cache.
    onSuccess: (outcome) => {
      toast.success(outcome.message)
      // Everything, without a filter — the one place in the app that does.
      //
      // A flow calls its service straight (`action.run`), so it never passes
      // through the typed hook that would know `['invoices']` or `['results']`
      // had moved. And these are the widest writes there are: collecting a fee
      // settles an invoice, moves the analytics, changes what a family owes and
      // what the counter has taken; approving a batch of results empties the
      // queue and fills three registers. Naming those keys here would be
      // guessing on behalf of thirteen different flows, and the guess that gets
      // forgotten is the bug being fixed.
      void queryClient.invalidateQueries()
    },
  })

  const run = async (values: Values) => {
    if (!action.run) {
      toast(action.done(picked.length))
      await navigate({ to: definition.path })
      return
    }

    setFailures([])
    const outcome = await flow.mutateAsync(values).catch(() => null)
    if (!outcome) return

    // A partial move is not something to walk away from — the rows that did
    // not move stay on screen with the reason the API gave for each.
    if (outcome.failures?.length) {
      setFailures(outcome.failures)
      return
    }
    await navigate({ to: definition.path })
  }

  // Allocate shows what the picked arms will actually bill, live.
  const total =
    action.unitAmount !== undefined && action.picker
      ? billing(action.picker.items, picked, action.unitAmount)
      : undefined
  const tiles = [
    ...action.summary,
    ...(total
      ? [
          { label: 'Students selected', value: String(total.students) },
          { label: 'Will bill', value: formatNaira(total.amount) },
        ]
      : []),
    ...(action.tally?.(answers) ?? []),
  ]

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <BackLink
        to={definition.path}
        label="Cancel and go back"
        backLabel="Cancel and go back"
      />

      <PageHeader
        kicker={action.kicker}
        title={action.title}
        description={action.description}
      />
      <Rule />

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            // Validation has passed; a flow that commits money asks once more.
            // A flow without a picker has no running total to show it.
            const ask = await action.confirm?.(total, values)
            if (!ask) return run(values)
            // Returned, not discarded: the dialog holds with its button
            // spinning while the payment is actually being taken.
            confirm.ask({ ...ask, onConfirm: () => run(values) })
          })}
          noValidate
        >
          {tiles.length > 0 && <TileStrip className="mb-6.5" tiles={tiles} />}

          {action.picker && (
            <PickerList<Values> name="picks" picker={action.picker} />
          )}

          <div className="mb-2 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4.5">
            {action.fields.map(renderField)}
          </div>

          {failures.length > 0 && <NotMoved failures={failures} />}

          <Rule />

          <div className="flex flex-wrap items-center gap-3">
            {/* `isSubmitting` alone is not enough: a flow that confirms has
                already resolved its submit handler by the time the dialog
                opens, so the write itself runs with the form idle. */}
            <Button
              type="submit"
              pending={form.formState.isSubmitting || flow.isPending}
            >
              {action.cta}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={flow.isPending}
              onClick={back}
            >
              Cancel
            </Button>
            <div className="flex-1" />
            <div className="text-xs text-muted-foreground">
              {action.footnote}
            </div>
          </div>
        </form>
      </FormProvider>

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </div>
  )
}
