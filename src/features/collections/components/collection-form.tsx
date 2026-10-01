import { blockedReason } from '../blocked'
import { canChange } from '../unsynced'
import { lazy, Suspense, useMemo } from 'react'
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { BackLink } from '@/components/page/back-link'
import { CheckboxGroupField } from '@/components/form/checkbox-group-field'
import { DateField } from '@/components/form/date-field'
import { FileField } from '@/components/form/file-field'
import { fromApiDate } from '../date-range'
import { toDateTimeInput } from '../when'
import { FormSection } from '@/components/form/form-section'
import { RecordForm } from '@/components/form/record-form'
import {
  SearchSelectField,
  UrlSearchSelectField,
} from '@/components/form/search-select-field'
import { RemoteSelectField } from '@/components/form/remote-select-field'
import { SelectField } from '@/components/form/select-field'
import { SettledSelectField } from '@/components/form/settled-select-field'
import { toOptions } from '@/features/collections/options'
import { MoneyField } from '@/components/form/money-field'
import { TextField } from '@/components/form/text-field'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { useConfirm } from '@/hooks/use-confirm'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useRecordForm } from '@/hooks/use-record-form'
import { BLANK } from '../blank'
import { schemaFromSections } from '../schema'
import { settledValue } from '../settled'
import { useRemoveRecord } from '../use-remove-record'
import { useSaveRecord } from '../use-save-record'
import type { WriteOutcome } from '@/db/write-outcome'
import type {
  CollectionDef,
  CollectionRoutes,
  FieldSpec,
  FormSectionSpec,
  Row,
} from '../types'

type Values = Record<string, unknown>

/**
 * The editor is a large dependency and most forms have no body to write, so
 * it is fetched by the forms that do rather than by every form there is.
 */
const RichTextField = lazy(() =>
  import('@/components/form/rich-text-field').then((module) => ({
    // Bound to this form's value shape here: `lazy` cannot carry a generic
    // through, so the type argument is applied at the import instead.
    default: module.RichTextField<Values>,
  })),
)

/**
 * `settled` says this field's answer arrived with the page, so it is shown
 * rather than asked. It is decided by `settledValue` and passed in, since only
 * the form knows what the page it was opened from had already chosen.
 */
function renderField(field: FieldSpec, record?: Row, settled?: boolean) {
  const shared = {
    name: field.key,
    label: field.label,
    hint: field.hint,
    required: field.required,
    span: field.wide ? (2 as const) : undefined,
  }

  if (field.multi && field.optionsFrom)
    return <CheckboxGroupField<Values> key={field.key} {...shared} from={field.optionsFrom} />
  if (field.money)
    return <MoneyField<Values> key={field.key} {...shared} placeholder={field.placeholder} />
  if (field.file)
    return (
      <FileField<Values>
        key={field.key}
        {...shared}
        accept={field.file}
        template={field.template}
        maxSize={field.maxBytes}
      />
    )
  if (field.date)
    return <DateField<Values> key={field.key} {...shared} past={field.past} />
  if (field.rich)
    return (
      <Suspense
        key={field.key}
        fallback={<div className="col-[1/-1] h-60 animate-ems-fade rounded-lg border border-input" />}
      >
        <RichTextField
          {...shared}
          span="full"
          placeholder={field.placeholder}
        />
      </Suspense>
    )
  if (field.searchFrom) {
    const searched = {
      ...shared,
      from: field.searchFrom,
      placeholder: field.placeholder,
      initialLabel: field.searchLabelKey
        ? (record?.[field.searchLabelKey] ?? undefined)
        : undefined,
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
  if (field.optionsFrom && settled)
    return (
      <SettledSelectField<Values>
        key={field.key}
        {...shared}
        from={field.optionsFrom}
      />
    )
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
    return (
      <SelectField<Values>
        key={field.key}
        {...shared}
        options={toOptions(field.options)}
      />
    )
  return (
    <TextField<Values>
      key={field.key}
      {...shared}
      placeholder={field.placeholder}
      type={
        field.email
          ? 'email'
          : field.datetime
            ? 'datetime-local'
            : field.time
              ? 'time'
              : field.number
                ? 'number'
                : 'text'
      }
      min={field.min}
      max={field.max}
      multiline={field.multiline}
    />
  )
}

/** Create or edit any collection record from its form definition. */
export function CollectionForm({
  definition,
  record,
  routes,
  preset,
}: {
  definition: CollectionDef
  /** Absent when creating. */
  record?: Row
  routes: CollectionRoutes
  /**
   * Fields already decided by wherever the form was opened from, read off the
   * URL. A topic added from a subject's page arrives with that subject
   * chosen, because it is the page's whole subject — asking again would be
   * asking a question the reader has just answered by being there.
   *
   * A field decided this way is **shown rather than asked** — see
   * `settled.ts` — so the reader reads the subject's name where the dropdown
   * was. The value is still the form's: registered, validated and submitted
   * exactly as a picked one. What guards against a link carrying the wrong id
   * is that a value the feed cannot name falls back to the picker, so a
   * settled field only ever states something the school can confirm.
   *
   * Ignored on an edit, where the record itself is what the form opens on.
   */
  preset?: Record<string, string>
}) {
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const confirm = useConfirm()
  const rawSections = definition.form ?? fallbackSections(definition)
  /*
   * Fields this record does not take are dropped before anything else reads
   * the form — the defaults, the validator and the rendering all work from
   * one list, so a withheld field cannot be required by a validator that
   * still knows about it.
   *
   * Keyed on the record rather than on what is being typed, so the shape of
   * the form is settled when it opens and does not move under somebody.
   */
  const sections = useMemo(
    () =>
      rawSections
        .map((section) => ({
          ...section,
          fields: section.fields.filter((field) => field.when?.(record) ?? true),
        }))
        .filter((section) => section.fields.length > 0),
    [rawSections, record],
  )

  const defaults: Values = {}
  for (const section of sections) {
    for (const field of section.fields) {
      // A blank is how the record reads, not what it holds — typing over an
      // em dash, or saving one back, is nobody's intent.
      const held = record?.[field.key] ?? (record ? undefined : preset?.[field.key])
      if (field.multi) {
        // A row holds strings, so a set of ids travels as one comma-joined
        // cell and is split back out here. Getting this wrong on an edit is
        // expensive: these keys replace the whole set, so a form that opened
        // with none ticked would save the class as charging no fees at all.
        defaults[field.key] = String(held ?? '').split(',').filter(Boolean)
        continue
      }
      // An upload starts empty however the record reads: the value is a
      // `File`, and the filename the row carries is not one.
      if (field.file) {
        defaults[field.key] = undefined
        continue
      }
      // A date opens on what the record holds, where the row wrote it in the
      // one format that can be read back — YYYY-MM-DD. A row carrying a
      // display date parses to nothing and the picker opens empty, which is
      // where every date field used to start.
      // A window opens on the stamp the school holds, cut down to the minute
      // the control can show. The row carries the school's own
      // `YYYY-MM-DD HH:MM:SS` under a `_at` key for exactly this — the
      // displayed "23 Sep 2026, 08:12" beside it parses to nothing here.
      if (field.datetime) {
        defaults[field.key] = toDateTimeInput(held === BLANK ? '' : String(held ?? ''))
        continue
      }
      defaults[field.key] = field.date
        ? fromApiDate(held)
        : held === BLANK
          ? ''
          : (held ?? '')
    }
  }

  const form = useRecordForm<Values>(schemaFromSections(sections), defaults)
  // Why this one cannot be saved right now, where it cannot. See `blocked.ts`.
  const blocked = blockedReason(definition, useOnlineStatus())
  // Sections that ask about the record's own kind — the staff form's teaching
  // half — appear once the kind is chosen, and never for the other one.
  const values = useWatch({ control: form.control })
  const shown = sections.filter((section) => section.when?.(values) ?? true)
  const editing = Boolean(record)
  const save = useSaveRecord(definition, editing)
  const remove = useRemoveRecord(definition)
  // Not every account may delete every record: an office record is a super
  // administrator's to remove, and the API refuses anyone else.
  const canDelete = Boolean(
    record &&
    (definition.remove || definition.queueRemove) &&
    canChange(record, definition.removeWhen),
  )
  /**
   * Leaving the form goes back the way it was opened rather than pushing the
   * record on top of it — a form that was cancelled used to stay in the
   * history, so the back button on the page behind it led straight back into
   * the form that had just been abandoned.
   */
  const back = () => {
    if (canGoBack) return router.history.back()
    return record
      ? navigate({
          to: routes.record,
          params: { collection: definition.id, recordId: record.id },
        })
      : navigate({ to: definition.path })
  }

  /**
   * The list is where a deleted record's page has to end up, so the navigation
   * waits for the API rather than leaving on the click — a refusal keeps the
   * form open on a record that still exists.
   */
  const askDelete = () =>
    confirm.ask({
      title: `Delete this ${definition.noun}?`,
      body:
        (record && definition.removeBody?.(record)) ??
        'This removes the record from the register. Anything already raised against it stays in the audit log.',
      subject: record?.[definition.nameKey] ?? '',
      cta: `Delete the ${definition.noun}`,
      // Awaited rather than fired: the dialog's button spins until the record
      // is actually gone, and a refusal leaves the form where it is.
      onConfirm: () =>
        remove.mutateAsync(record!.id).then(() => navigate({ to: definition.path })),
    })

  return (
    <>
      <RecordForm
        form={form}
        blocked={blocked}
        // Cold-opened, a form has no page behind it; the register it belongs
        // to is the one place that is certain to exist either way.
        back={
          <BackLink
            to={definition.path}
            label={`Back to ${definition.homeLabel ?? definition.title.toLowerCase()}`}
          />
        }
        kicker={`${definition.kicker} · ${definition.title}`}
        title={editing ? `Edit ${definition.noun}` : definition.action}
        description={
          editing
            ? 'Changes take effect as soon as you save.'
            : `Nothing is saved until you press ${definition.action.toLowerCase()}.`
        }
        submitLabel={editing ? 'Save changes' : definition.action}
        onSubmit={async (values) => {
          /*
           * A queued write is accepted on the device and returns at once, so it
           * does not go through a mutation at all. Routing it through one put
           * three async things in the way of something synchronous — the
           * mutation cache, the router's loaders and react-hook-form's own
           * submitting state — and the form sat with its button spinning over a
           * write that was already safe. The queue raises its own toast.
           */
          if (definition.queue) {
            /*
             * Awaited, and now for two reasons. It was always possible for a
             * write to need something off the device before it had a body — an
             * enrolment reads which session is current — and the form could not
             * close before that was written down. Now the write itself goes to
             * the school first and this waits for the answer, which is what
             * lets a refusal land on the form that caused it.
             */
            let outcome: WriteOutcome | void
            try {
              outcome = await definition.queue(values, record?.id)
            } catch (error) {
              // The read the write needed refused — a set this device has
              // never synced, on a device with no connection to sync it now.
              // Said out loud, with the form and everything typed left open:
              // an unhandled rejection here was a save that failed silently.
              toast.error(errorMessage(error, OFFLINE_MESSAGE))
              return
            }
            /*
             * The school heard it and said no. The queue has raised the
             * school's own sentence, and the form stays exactly as it is —
             * closing it would throw away the typing over a refusal the writer
             * can very often fix in one field. `held` and `sent` both close:
             * one is on its way, the other has arrived.
             */
            if (outcome === 'refused') return
            back()
            return
          }
          if (definition.save) {
            // A refusal has already been announced by the mutation cache;
            // swallowing it here only keeps the form open on the values typed.
            const saved = await save
              .mutateAsync({ values, recordId: record?.id })
              .catch(() => null)
            if (!saved) return
          } else {
            toast(editing ? 'Changes saved' : `${definition.noun} created`)
          }
          back()
        }}
        onCancel={back}
        // Offered only where the API can actually delete. A collection with no
        // `remove` used to show the button anyway and answer with a toast
        // saying the record was deleted, which it never was.
        deleteLabel={canDelete ? 'Delete this record' : undefined}
        onDelete={canDelete ? askDelete : undefined}
      >
        {shown.map((section) => (
          <FormSection key={section.title} title={section.title}>
            {section.fields.map((field) =>
              renderField(field, record, Boolean(settledValue(field, preset, editing))),
            )}
          </FormSection>
        ))}
      </RecordForm>

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </>
  )
}

/** Collections without a bespoke form fall back to one field per column. */
function fallbackSections(definition: CollectionDef): FormSectionSpec[] {
  return [
    {
      title: 'Details',
      fields: definition.columns.map((column, index) => ({
        key: column.key,
        label: column.label,
        required: index === 0,
      })),
    },
  ]
}
