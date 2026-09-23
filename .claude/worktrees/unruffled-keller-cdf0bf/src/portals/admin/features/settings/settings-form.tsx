import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/error-state'
import { Shimmer } from '@/components/feedback/shimmer'
import { DateField } from '@/components/form/date-field'
import { FormSection } from '@/components/form/form-section'
import { RecordForm } from '@/components/form/record-form'
import { TextField } from '@/components/form/text-field'
import { Rule } from '@/components/page/rule'
import { useSchoolSettings, useUpdateSettings } from '@/api/settings/hooks'
import { useRecordForm } from '@/hooks/use-record-form'
import {
  datesOutOfOrder,
  type SettingsValues,
  settingsBody,
  settingsValues,
} from './settings-values'

const schema = z.object({
  name: z.string().trim().min(1, 'The school needs a name'),
  phone: z.string(),
  // Optional, but a typo here is a receipt nobody can reply to.
  email: z.union([z.literal(''), z.email('That does not look like an email address')]),
  address: z.string(),
  rector: z.string(),
  rectorcerts: z.string(),
  registrar: z.string(),
  registrarcerts: z.string(),
  regnoformat: z.string(),
  application_no_prefix: z.string(),
  currenttermends: z.date().optional(),
  nexttermbegins: z.date().optional(),
}) satisfies z.ZodType<SettingsValues>

export function SettingsForm() {
  const { data, isPending, isError, error, refetch } = useSchoolSettings()
  const update = useUpdateSettings()
  const form = useRecordForm<SettingsValues>(schema, settingsValues(undefined))

  // The row arrives after the form is mounted, so the fields are filled when
  // it does. Keyed on the object react-query hands back, which only changes
  // when the row itself does — a refetch answering the same settings leaves
  // anything half-typed alone.
  // Only the two dates, rather than `form.watch()`: the warning below depends
  // on nothing else, and watching everything would re-render the page on every
  // character typed into the address.
  const [ends, begins] = useWatch({
    control: form.control,
    name: ['currenttermends', 'nexttermbegins'],
  })

  const { reset } = form
  useEffect(() => {
    if (data) reset(settingsValues(data))
  }, [data, reset])

  if (isError) {
    return (
      <ErrorState error={error} homeTo="/admin" onRetry={() => void refetch()} />
    )
  }

  if (isPending) {
    return (
      <div className="max-w-[780px]">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="mt-3.5 h-[34px] w-56" />
        <Rule />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
          {Array.from({ length: 8 }, (_, index) => (
            <Shimmer key={index} className="h-[58px]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <RecordForm<SettingsValues>
      form={form}
      kicker="School"
      title="Settings"
      description="Who the school is on every invoice, receipt and result sheet, and the dates the term runs to."
      submitLabel="Save settings"
      onSubmit={async (values) => {
        await update.mutateAsync(settingsBody(values))
      }}
      onCancel={() => reset(settingsValues(data))}
    >
      <FormSection title="School">
        <TextField<SettingsValues>
          name="name"
          label="Name"
          required
          span="full"
          hint="Printed at the head of every invoice, receipt and result sheet."
        />
        <TextField<SettingsValues> name="phone" label="Phone" type="tel" />
        <TextField<SettingsValues>
          name="email"
          label="Email"
          type="email"
          hint="Where families are told to reply."
        />
        <TextField<SettingsValues> name="address" label="Address" multiline span="full" />
      </FormSection>

      <FormSection title="Who signs">
        <TextField<SettingsValues>
          name="rector"
          label="Head of school"
          span={2}
          hint="Signs result sheets and testimonials."
        />
        <TextField<SettingsValues>
          name="rectorcerts"
          label="Qualifications"
          placeholder="PhD"
          hint="Printed after the name."
        />
        <TextField<SettingsValues>
          name="registrar"
          label="Registrar"
          span={2}
          hint="Signs admission letters and transcripts."
        />
        <TextField<SettingsValues> name="registrarcerts" label="Qualifications" placeholder="PhD" />
      </FormSection>

      <FormSection title="Numbering">
        <TextField<SettingsValues>
          name="regnoformat"
          label="Admission number prefix"
          placeholder="NETPRO/"
          hint="Goes in front of every new pupil's admission number. Numbers already issued keep the prefix they were given."
        />
        <TextField<SettingsValues>
          name="application_no_prefix"
          label="Application number prefix"
          placeholder="APP"
          hint="Goes in front of every new application."
        />
      </FormSection>

      <FormSection title="The term">
        <DateField<SettingsValues>
          name="currenttermends"
          label="Current term ends"
          hint="Printed on reports so families know when to collect."
        />
        <DateField<SettingsValues>
          name="nexttermbegins"
          label="Next term begins"
          hint={
            datesOutOfOrder(ends, begins)
              ? 'This is before the current term ends. Check both dates.'
              : 'Printed beside it, so the two read as one line.'
          }
        />
        <CurrentlyIn />
      </FormSection>
    </RecordForm>
  )
}

/**
 * Which session and term the school is in, read-only.
 *
 * They are changed from their own registers, where the dialog can say what
 * moving them does to everything recorded afterwards. Offering the same switch
 * here as a quiet dropdown among the addresses and the phone number would be
 * the same decision made with none of that in front of you.
 */
function CurrentlyIn() {
  const { data } = useSchoolSettings()
  const calendar = data?.calendar

  return (
    <div className="col-[1/-1] border-2 border-divider px-4 py-3.5">
      <div className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
        The school is in
      </div>
      <div className="mt-1.5 font-heading text-[15px] font-extrabold">
        {[calendar?.session, calendar?.semester].filter(Boolean).join(' · ') || '—'}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Changed on the{' '}
        <Link to="/admin/calendar" className="text-brand underline underline-offset-2">
          sessions
        </Link>{' '}
        and{' '}
        <Link to="/admin/terms" className="text-brand underline underline-offset-2">
          terms
        </Link>{' '}
        registers, where the confirm says what moving it does to everything recorded
        afterwards.
      </p>
    </div>
  )
}
