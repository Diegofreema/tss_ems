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

const ARMS = ['JSS1 A', 'JSS2 A', 'SS1 A', 'SS2 B', 'Primary 5 A'] as const
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

/** Links an already-enrolled pupil to this account, subject to office review. */
export function AddChildForm() {
  const navigate = useNavigate()
  const form = useRecordForm<Values>(schema, {
    adm: '',
    surname: '',
    firstname: '',
    arm: ARMS[0],
    relationship: RELATIONSHIPS[0],
    phone: '',
    declared: false,
  })

  return (
    <div className="max-w-[680px]">
      <BackLink
        to="/parent/children"
        label="Back to my children"
        backLabel="Cancel and go back"
      />

      <PageHeader
        kicker="My children"
        title="Add a child to your account"
        description="The pupil must already be enrolled. The office checks that the details match their record before the child appears here."
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

          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
            <TextField<Values>
              name="adm"
              label="Admission number"
              required
              placeholder="NEB/2024/1610"
              hint="On the pupil’s invoice and report sheet"
            />
            <TextField<Values>
              name="surname"
              label="Pupil surname"
              required
              placeholder="Udo"
            />
            <TextField<Values>
              name="firstname"
              label="Pupil first name"
              required
              placeholder="Chidi"
            />
            <SelectField<Values> name="arm" label="Class" required options={toOptions(ARMS)} />
            <SelectField<Values>
              name="relationship"
              label="Your relationship"
              required
              options={toOptions(RELATIONSHIPS)}
            />
            <TextField<Values>
              name="phone"
              label="Phone on the pupil record"
              required
              placeholder="0803 000 0000"
              hint="Must match the number the school holds"
            />
          </div>

          <DeclarationField<Values>
            name="declared"
            statement="I am the parent or legal guardian of this pupil and accept that the school may check this claim against its records."
            hint="The office checks this against the pupil record"
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

      <p className="mt-[18px] text-[12.5px] leading-relaxed text-muted-foreground">
        Requests are reviewed by the school office, usually within a working
        day. You will get an email either way.
      </p>
    </div>
  )
}
