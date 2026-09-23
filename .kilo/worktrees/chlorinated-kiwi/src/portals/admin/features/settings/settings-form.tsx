import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/error-state'
import { Shimmer } from '@/components/feedback/shimmer'
import { DateField } from '@/components/form/date-field'
import { FormSection } from '@/components/form/form-section'
import { RecordForm } from '@/components/form/record-form'
import { MoneyField } from '@/components/form/money-field'
import { TextField } from '@/components/form/text-field'
import { Rule } from '@/components/page/rule'
import { collectionError, refetchCollection } from '@/db/collection'
import { refSettings } from '@/db/collections/reference'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { useHeldDocument } from '@/db/live'
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
  // The mask on a money field already refuses letters, so the only way to
  // reach this rule is an empty box — which is allowed, and means "leave what
  // the library charges alone". See `settingsBody`.
  regfee: z.string(),
  currenttermends: z.date().optional(),
  nexttermbegins: z.date().optional(),
}) satisfies z.ZodType<SettingsValues>

export function SettingsForm() {
  // The one settings row, off the device's own set — filled with no
  // connection, and saved through the queue for the same reason: the office
  // correcting the school's address should not lose a full form to a
  // connection that went while they typed.
  const { doc: data, pending: isPending, failed: isError } = useHeldDocument(refSettings)
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
      <ErrorState
        error={collectionError(SET.refSettings)}
        homeTo="/admin"
        onRetry={() => void refetchCollection(SET.refSettings)}
      />
    )
  }

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-[780px]">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="mt-3.5 h-8.5 w-56" />
        <Rule />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4.5">
          {Array.from({ length: 8 }, (_, index) => (
            <Shimmer key={index} className="h-14.5" />
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
        /*
         * Awaited, so the button spins for the round trip rather than saying
         * done before the school has heard. Nothing is cleared or navigated
         * either way, so a refusal simply leaves the page as it is — with the
         * school's own reason in a toast over it.
         */
        await enqueue({
          handler: WRITE.updateSettings,
          payload: settingsBody(values),
          collectionId: SET.refSettings,
          toast: { success: 'Settings saved' },
          label: 'School settings',
        })
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
          hint="Goes in front of every new student's admission number. Numbers already issued keep the prefix they were given."
        />
        <TextField<SettingsValues>
          name="application_no_prefix"
          label="Application number prefix"
          placeholder="APP"
          hint="Goes in front of every new application."
        />
      </FormSection>

      <FormSection title="The library">
        <MoneyField<SettingsValues>
          name="regfee"
          label="Late fee"
          span={2}
          placeholder="0"
          hint="Charged to a pupil who brings a book back after the day it was due. The school keeps this on its own row, under the name regfee — nothing to do with registration."
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
  const { doc } = useHeldDocument(refSettings)
  const calendar = doc?.calendar

  return (
    <div className="col-[1/-1] rounded-lg border border-divider bg-raised px-4 py-3.5">
      <div className="text-2xs uppercase tracking-label text-muted-foreground">
        The school is in
      </div>
      <div className="mt-1.5 font-heading text-base font-extrabold">
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
