import type { ReactNode } from 'react'
import { DateField } from '@/components/form/date-field'
import { SelectField } from '@/components/form/select-field'
import { TextField } from '@/components/form/text-field'
import { RELIGIONS } from '@/portals/admin/collections/student-row'
import { LABELS, type ApplicationField, type ApplicationValues } from '../schema'
import { useStates } from '../use-states'
import { Review } from './review'

const GENDERS = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
]

const RELIGION_OPTIONS = RELIGIONS.map((religion) => ({ value: religion, label: religion }))

function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-4 gap-y-5">
      {children}
    </div>
  )
}

function Text({
  name,
  optional,
  ...rest
}: {
  name: ApplicationField
  optional?: boolean
  hint?: string
  placeholder?: string
  type?: 'text' | 'email' | 'tel'
  span?: 2 | 'full'
}) {
  return (
    <TextField<ApplicationValues> name={name} label={LABELS[name]} required={!optional} {...rest} />
  )
}

function Child() {
  return (
    <Grid>
      <Text name="fname" />
      <Text name="mname" optional />
      <Text name="lname" />
      <SelectField<ApplicationValues>
        name="gender"
        label={LABELS.gender}
        options={GENDERS}
        required
      />
      <DateField<ApplicationValues> name="dob" label={LABELS.dob} past required />
      <SelectField<ApplicationValues>
        name="religion"
        label={LABELS.religion}
        options={RELIGION_OPTIONS}
        required
      />
      <Text
        name="pschools"
        optional
        span="full"
        placeholder="e.g. Sunrise Primary School"
        hint="The school your child is coming from, if any."
      />
    </Grid>
  )
}

function Home() {
  const states = useStates()
  return (
    <Grid>
      <Text name="address" span="full" placeholder="House number, street and town" />
      <Text
        name="phone"
        type="tel"
        placeholder="0803 123 4567"
        hint="The number the school calls first."
      />
      <SelectField<ApplicationValues>
        name="state_id"
        label={LABELS.state_id}
        options={states.data ?? []}
        placeholder={states.isPending ? 'Loading…' : 'Choose a state'}
        hint="Leave empty if the family is not from Nigeria."
      />
      <Text
        name="email"
        type="email"
        optional
        span="full"
        placeholder="child@example.com"
        hint="Only if your child has an email address of their own."
      />
    </Grid>
  )
}

function Parents() {
  return (
    <div className="grid gap-7">
      <Parent who="Father" name="fathersname" phone="fatherphone" job="fathersjob" />
      <Parent who="Mother" name="mothersname" phone="motherphone" job="mothersjob" />
      <Grid>
        <Text
          name="pemailaddress"
          type="email"
          optional
          span="full"
          placeholder="family@example.com"
          hint="Where the admissions office sends its reply."
        />
      </Grid>
    </div>
  )
}

/**
 * One parent's three boxes. None is marked required on its own, because none
 * is: the rule is at least one parent, and a number for whoever is named —
 * the schema says so in words when it is not met.
 */
function Parent({
  who,
  name,
  phone,
  job,
}: {
  who: string
  name: ApplicationField
  phone: ApplicationField
  job: ApplicationField
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
        {who}
      </legend>
      <Grid>
        <Text name={name} optional />
        <Text name={phone} optional type="tel" />
        <Text name={job} optional />
      </Grid>
    </fieldset>
  )
}

/** Each step's body, in the order `STEPS` names them. */
export function StepBody({ index, onEdit }: { index: number; onEdit: (step: number) => void }) {
  switch (index) {
    case 0:
      return <Child />
    case 1:
      return <Home />
    case 2:
      return <Parents />
    default:
      return <Review onEdit={onEdit} />
  }
}
