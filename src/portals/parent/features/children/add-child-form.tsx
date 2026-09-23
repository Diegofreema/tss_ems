import { Link, useNavigate } from '@tanstack/react-router'
import { FormProvider } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { BackLink } from '@/components/page/back-link'
import { DeclarationField } from '@/components/form/declaration-field'
import { FormErrorBanner } from '@/components/form/form-error-banner'
import { SelectField } from '@/components/form/select-field'
import { toOptions } from '@/features/collections/options'
import { TextField } from '@/components/form/text-field'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useRecordForm } from '@/hooks/use-record-form'

/*
 * The class is typed rather than picked. A guardian login can read no register
 * of classes — `/departments`, `/class-arms` and `/subjects` all answer
 * "restricted to administrators" — so a select here could only offer a list
 * written into this file, and the one that was here offered five arms this
 * school does not have. The office checks the answer against the record
 * either way; a wrong class is a question they ask, an invented one is a
 * choice this app put in the parent's mouth.
 */
const RELATIONSHIPS = ['Mother', 'Father', 'Legal guardian'] as const

const required = z.string().trim().min(1, 'Required')

const schema = z.object({
  adm: required,
  surname: required,
  firstname: required,
  arm: required,
  relationship: required,
  phone: required,
  declared: z
    .boolean()
    .refine(
      (value) => value,
      'You have to confirm this before the request can be sent',
    ),
})

type Values = z.infer<typeof schema>

/** Links an already-enrolled student to this account, subject to office review. */
export function AddChildForm() {
  const navigate = useNavigate()
  const form = useRecordForm<Values>(schema, {
    adm: '',
    surname: '',
    firstname: '',
    arm: '',
    relationship: RELATIONSHIPS[0],
    phone: '',
    declared: false,
  })

  return (
    <div className="mx-auto w-full max-w-[680px]">
      <BackLink
        to="/parent/children"
        label="Back to my children"
        backLabel="Cancel and go back"
      />

      <PageHeader
        kicker="My children"
        title="Add a child to your account"
        description="The student must already be enrolled. The office checks that the details match their record before the child appears here."
      />
      <Rule />

      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(() => {
            toast('Request sent to the school office')
            void navigate({ to: '/parent/children' })
          })}
        >
          <FormErrorBanner count={Object.keys(form.formState.errors).length} />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4.5">
            <TextField<Values>
              name="adm"
              label="Admission number"
              required
              placeholder="NEB/2024/1610"
              hint="On the student’s invoice and report sheet"
            />
            <TextField<Values>
              name="surname"
              label="Student surname"
              required
              placeholder="Udo"
            />
            <TextField<Values>
              name="firstname"
              label="Student first name"
              required
              placeholder="Chidi"
            />
            <TextField<Values>
              name="arm"
              label="Class"
              required
              placeholder="JSS 1 A"
              hint="The class and arm as it reads on their report sheet"
            />
            <SelectField<Values>
              name="relationship"
              label="Your relationship"
              required
              options={toOptions(RELATIONSHIPS)}
            />
            <TextField<Values>
              name="phone"
              label="Phone on the student record"
              required
              placeholder="0803 000 0000"
              hint="Must match the number the school holds"
            />
          </div>

          <DeclarationField<Values>
            name="declared"
            statement="I am the parent or legal guardian of this student and accept that the school may check this claim against its records."
            hint="The office checks this against the student record"
          />
          <Rule />

          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Send the request
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to="/parent/children">Cancel</Link>
            </Button>
          </div>
        </form>
      </FormProvider>

      <p className="mt-4.5 text-xs leading-relaxed text-muted-foreground">
        Requests are reviewed by the school office, usually within a working
        day. You will get an email either way.
      </p>
    </div>
  )
}
