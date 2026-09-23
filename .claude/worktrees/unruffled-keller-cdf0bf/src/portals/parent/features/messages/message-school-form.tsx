import { FormProvider } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { SegmentedControl } from '@/components/common/segmented-control'
import { FormErrorBanner } from '@/components/form/form-error-banner'
import { SelectField } from '@/components/form/select-field'
import { toOptions } from '@/features/collections/options'
import { TextField } from '@/components/form/text-field'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useRecordForm } from '@/hooks/use-record-form'
import { useFamily, useParentStore } from '../../parent.store'

const ABOUT = [
  'Fees and payments',
  'Attendance',
  'Results and marking',
  'Health and welfare',
  'Something else',
] as const

const schema = z.object({
  about: z.string().trim().min(1, 'Required'),
  subject: z.string().trim().min(1, 'Required'),
  body: z
    .string()
    .trim()
    .min(10, 'Write at least a line — ten characters or more.'),
})

type Values = z.infer<typeof schema>

/** Goes to the school office, about one child. */
export function MessageSchoolForm() {
  const family = useFamily()
  const childId = useParentStore((state) => state.childId)
  const selectChild = useParentStore((state) => state.selectChild)
  const form = useRecordForm<Values>(schema, {
    about: ABOUT[0],
    subject: '',
    body: '',
  })

  return (
    <div className="max-w-[640px]">
      <PageHeader
        kicker="Messages"
        title="Message the school"
        description="Goes to the school office, who pass it to the right person. Anything about money reaches the bursary the same day."
      />
      <Rule />

      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(() => {
            toast('Message sent')
            form.reset({ about: ABOUT[0], subject: '', body: '' })
          })}
        >
          <FormErrorBanner count={Object.keys(form.formState.errors).length} />

          <div className="flex flex-col gap-4">
            <SelectField<Values> name="about" label="About" options={toOptions(ABOUT)} />

            <div>
              <Label className="mb-[5px] block text-xs font-normal text-foreground/70">
                Which child
              </Label>
              <SegmentedControl
                name="msg-child"
                value={String(childId ?? family[0]?.id ?? '')}
                onChange={(value) => selectChild(Number(value))}
                options={family.map((child) => ({
                  value: String(child.id),
                  label: child.name,
                }))}
              />
            </div>

            <TextField<Values>
              name="subject"
              label="Subject"
              required
              placeholder="One line — what this is about"
              hint="Keep it short — it is what the office sees first"
            />
            <TextField<Values>
              name="body"
              label="Message"
              required
              multiline
              hint="The office replies by email and in this portal."
            />

            <div className="flex gap-2.5">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Send message
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => toast('Draft saved locally')}
              >
                Save draft
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
      <Rule />

      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        The office answers most messages within a working day. For an urgent
        matter about a child on the premises, telephone 0803 000 0000.
      </p>
    </div>
  )
}
