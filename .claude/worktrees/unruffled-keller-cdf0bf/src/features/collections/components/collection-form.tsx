import { lazy, Suspense } from 'react'
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { BackLink } from '@/components/page/back-link'
import { CheckboxGroupField } from '@/components/form/checkbox-group-field'
import { DateField } from '@/components/form/date-field'
import { FileField } from '@/components/form/file-field'
import { fromApiDate } from '../date-range'
import { FormSection } from '@/components/form/form-section'
import { RecordForm } from '@/components/form/record-form'
import { RemoteSelectField } from '@/components/form/remote-select-field'
import { SelectField } from '@/components/form/select-field'
import { toOptions } from '@/features/collections/options'
import { MoneyField } from '@/components/form/money-field'
import { TextField } from '@/components/form/text-field'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { useConfirm } from '@/hooks/use-confirm'
import { useRecordForm } from '@/hooks/use-record-form'
import { BLANK } from '../blank'
import { schemaFromSections } from '../schema'
import { useRemoveRecord } from '../use-remove-record'
import { useSaveRecord } from '../use-save-record'
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

function renderField(field: FieldSpec) {
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
    return <FileField<Values> key={field.key} {...shared} accept={field.file} />
  if (field.date)
    return <DateField<Values> key={field.key} {...shared} past={field.past} />
  if (field.rich)
    return (
      <Suspense
        key={field.key}
        fallback={<div className="col-[1/-1] h-[15rem] animate-ems-fade rounded-lg border border-input" />}
      >
        <RichTextField
          {...shared}
          span="full"
          placeholder={field.placeholder}
        />
      </Suspense>
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
        field.email ? 'email' : field.time ? 'time' : field.number ? 'number' : 'text'
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
}: {
  definition: CollectionDef
  /** Absent when creating. */
  record?: Row
  routes: CollectionRoutes
}) {
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const confirm = useConfirm()
  const sections = definition.form ?? fallbackSections(definition)

  const defaults: Values = {}
  for (const section of sections) {
    for (const field of section.fields) {
      // A blank is how the record reads, not what it holds — typing over an
      // em dash, or saving one back, is nobody's intent.
      const held = record?.[field.key]
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
      defaults[field.key] = field.date
        ? fromApiDate(held)
        : held === BLANK
          ? ''
          : (held ?? '')
    }
  }

  const form = useRecordForm<Values>(schemaFromSections(sections), defaults)
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
    record && definition.remove && (definition.removeWhen?.(record) ?? true),
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
        // Cold-opened, a form has no page behind it; the register it belongs
        // to is the one place that is certain to exist either way.
        back={
          <BackLink
            to={definition.path}
            label={`Back to ${definition.title.toLowerCase()}`}
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
            {section.fields.map(renderField)}
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
