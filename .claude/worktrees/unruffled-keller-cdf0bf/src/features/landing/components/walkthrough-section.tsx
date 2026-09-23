import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { SelectField } from '@/components/form/select-field'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { useRecordForm } from '@/hooks/use-record-form'
import { SIZE_OPTIONS } from '../landing.content'
import { walkthroughSchema, type WalkthroughValues } from '../schemas'
import { Reveal } from './reveal'
import { Lede, Section, SectionHeading } from './section'

/** The page's one conversion. */
export function WalkthroughSection() {
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useRecordForm<WalkthroughValues>(walkthroughSchema, {
    school: '',
    email: '',
    size: SIZE_OPTIONS[0].value,
  })

  // ponytail: there is no lead endpoint on this deployment, so the request is
  // acknowledged and goes no further. This is the single call site — when there
  // is a CRM to post to, it is awaited here and the button's pending state and
  // its failure message hang off that one call.
  const onSubmit = (values: WalkthroughValues) => {
    setSentTo(values.email.trim())
  }

  const reset = () => {
    form.reset({ school: '', email: '', size: SIZE_OPTIONS[0].value })
    setSentTo(null)
  }

  return (
    <Section
      id="quote"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-[clamp(24px,4vw,56px)] py-[clamp(48px,7vw,92px)]"
    >
      <Reveal>
        <SectionHeading
          kicker="Book a walkthrough"
          title="Thirty minutes, your own register on screen."
        >
          <Lede className="mt-3.5 max-w-[42ch] text-[clamp(14.5px,1.4vw,17px)]">
            Send us the name of the school and how many students you carry. We will
            set up a sandbox with your classes in it before the call.
          </Lede>
        </SectionHeading>
      </Reveal>

      <Reveal className="border-2 border-ink p-[clamp(20px,3vw,28px)]">
        {sentTo ? (
          <div className="grid gap-3">
            <div className="size-5.5 bg-brand" />
            <div className="font-heading text-[clamp(19px,2vw,24px)] font-extrabold tracking-[-.02em]">
              Request received.
            </div>
            <p className="m-0 text-[13.5px] leading-[1.55] text-neutral-700">
              We will reply to {sentTo} within one working day with two times to
              choose from.
            </p>
            <Button variant="outline" onClick={reset} className="h-11 justify-self-start">
              Send another
            </Button>
          </div>
        ) : (
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="grid gap-3.5 [&_input]:h-11 [&_[data-slot=select-trigger]]:h-11"
            >
              <TextField<WalkthroughValues>
                name="school"
                label="School name"
                placeholder="e.g. Grace Height College"
              />
              <TextField<WalkthroughValues>
                name="email"
                label="Work email"
                type="email"
                placeholder="you@school.edu.ng"
              />
              <SelectField<WalkthroughValues>
                name="size"
                label="Students enrolled"
                options={SIZE_OPTIONS}
              />

              <div className="text-[11.5px] text-neutral-600">
                We use this once, to arrange the call.
              </div>

              <Button
                type="submit"
                pending={form.formState.isSubmitting}
                className="h-12 w-full justify-start text-[15px]"
              >
                Request the walkthrough
              </Button>
            </form>
          </FormProvider>
        )}
      </Reveal>
    </Section>
  )
}
