import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, CircleAlert, CircleCheck, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { studentsService } from '@/api/students/service'
import { Panel } from '@/components/page/panel'
import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { applicationBody, refusedFields } from './body'
import { Stepper } from './components/stepper'
import { StepBody } from './components/steps'
import { clearDraft, readDraft, saveDraft } from './draft'
import {
  applicationSchema,
  EMPTY_APPLICATION,
  LABELS,
  STEPS,
  stepOf,
  type ApplicationField,
  type ApplicationValues,
} from './schema'

const LAST = STEPS.length - 1
const PARENT_NAMES: ApplicationField[] = ['fathersname', 'mothersname']

/**
 * The public application form: a family with no account applies for a place
 * for their child, a step at a time, and the office reviews it on Applicants.
 *
 * **It goes straight to the school and is never queued.** The outbox belongs
 * to a signed-in session — it is wiped at sign-out and its handlers act as
 * whoever holds the token — and nobody applying is signed in. So it says so
 * before it is filled in: offline, a banner says the form can be finished but
 * not sent, and a draft of everything typed is kept for the tab (`draft.ts`)
 * so a dropped connection costs a retry, not the form.
 *
 * A refusal keeps everything. The school's sentence goes at the top, each
 * field it named gets its own, and the applicant is taken to the first step
 * holding one — the same rule every write in this app follows.
 */
export function ApplyPage() {
  const form = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { ...EMPTY_APPLICATION, ...readDraft() },
    // The app's own rule: checked when the applicant moves on, not per keystroke.
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  })
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [refusal, setRefusal] = useState<string>()
  const [sent, setSent] = useState<{ child: string; reach: string }>()
  const online = useOnlineStatus()
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values, name }) => {
        saveDraft(values)
        // Checked when the applicant moves on, never per keystroke — but a
        // field somebody is fixing stops being told off for what it held.
        // The two parents' names share one complaint, so naming either
        // answers it for both.
        const fixing = PARENT_NAMES.includes(name as ApplicationField)
          ? PARENT_NAMES
          : name
            ? [name as ApplicationField]
            : []
        for (const field of fixing) {
          if (form.getFieldState(field).error) form.clearErrors(field)
        }
      },
    })
  }, [form])

  const go = (index: number) => {
    setStep(index)
    setReached((furthest) => Math.max(furthest, index))
    // A new step is a new page to a screen reader, and on a phone the top of
    // it is where the reader's eye has to go back to.
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const next = async () => {
    const fields = STEPS[step].fields as ApplicationField[]
    if (await form.trigger(fields, { shouldFocus: true })) go(step + 1)
  }

  const send = async (values: ApplicationValues) => {
    setRefusal(undefined)
    try {
      await studentsService.apply(applicationBody(values))
      clearDraft()
      setSent({
        child: values.fname.trim(),
        reach: values.pemailaddress.trim() || values.phone.trim(),
      })
      window.scrollTo({ top: 0 })
    } catch (error) {
      const refused = error instanceof ApiError ? refusedFields(error.errors) : {}
      const known = Object.keys(refused).filter((field) => field in LABELS)
      for (const field of known) {
        form.setError(field as ApplicationField, { message: refused[field] })
      }
      setRefusal(errorMessage(error, OFFLINE_MESSAGE))
      if (known[0]) go(stepOf(known[0]))
    }
  }

  // Every step was checked on the way here, so this is only reached if
  // something changed behind the review — send the applicant to it.
  const sendBack = (errors: Partial<Record<string, unknown>>) => {
    const first = Object.keys(errors)[0]
    if (first) go(stepOf(first))
  }

  // Enter in a field moves the form on rather than sending half of it.
  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (step < LAST) void next()
    else void form.handleSubmit(send, sendBack)()
  }

  const current = STEPS[step]

  return (
    <div className="min-h-dvh bg-ground text-foreground">
      <header className="sticky top-0 z-30 border-b border-divider bg-[color-mix(in_srgb,var(--ems-ground)_88%,transparent)] backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-280 items-center gap-4 px-content py-3">
          <Link to="/sign-in" aria-label="Back to sign in">
            <img src="/netpro-logo.webp" alt="netpro" className="h-7 w-auto" />
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Already a student?</span>
            <Button asChild variant="outline" size="sm">
              <Link to="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="@container/apply mx-auto max-w-280 px-content pt-8 pb-16">
        <div className="mb-8 max-w-2xl">
          <div className="text-xs font-bold tracking-[0.08em] text-brand uppercase">Admissions</div>
          <h1 className="mt-2 font-heading text-page-title leading-tight font-extrabold tracking-[-0.02em]">
            Apply for admission
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Three short steps about your child, your home and the parents, then a last look
            before you send it. Everything you type is kept on this tab until you do.
          </p>
        </div>

        {sent ? (
          <Sent {...sent} />
        ) : (
          <div className="grid gap-6 @3xl/apply:grid-cols-[240px_minmax(0,1fr)] @3xl/apply:gap-10">
            <aside className="self-start @3xl/apply:sticky @3xl/apply:top-24">
              <Stepper steps={STEPS} current={step} reached={reached} onOpen={go} />
            </aside>

            <FormProvider {...form}>
              <form onSubmit={onSubmit} noValidate>
                <Panel className="p-5 @xl/apply:p-7">
                  {!online && (
                    <Notice tone="warn" icon={<WifiOff className="size-4.5" strokeWidth={2.2} />}>
                      You are offline. You can keep filling this in, but it can only be sent once
                      you are connected again.
                    </Notice>
                  )}
                  {refusal && (
                    <Notice tone="danger" icon={<CircleAlert className="size-4.5" strokeWidth={2.2} />}>
                      <span className="font-semibold">Your application was not sent.</span> {refusal}
                    </Notice>
                  )}

                  <div className="mb-6">
                    <h2
                      ref={heading}
                      tabIndex={-1}
                      className="font-heading text-xl font-extrabold tracking-[-0.01em] outline-none"
                    >
                      {current.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{current.blurb}</p>
                  </div>

                  <div key={current.id} className="animate-ems-in">
                    <StepBody index={step} onEdit={go} />
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-3 border-t border-divider pt-5">
                    {step > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => go(step - 1)}
                        disabled={form.formState.isSubmitting}
                      >
                        <ArrowLeft className="size-4" />
                        Back
                      </Button>
                    ) : (
                      <span />
                    )}
                    {step < LAST ? (
                      <Button type="submit">
                        Continue
                        <ArrowRight className="size-4" />
                      </Button>
                    ) : (
                      <Button type="submit" pending={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Sending…' : 'Submit application'}
                      </Button>
                    )}
                  </div>
                </Panel>
              </form>
            </FormProvider>
          </div>
        )}
      </main>
    </div>
  )
}

function Notice({
  tone,
  icon,
  children,
}: {
  tone: 'warn' | 'danger'
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={
        tone === 'danger'
          ? 'mb-6 flex animate-ems-up gap-3 rounded-lg border border-danger/50 bg-danger-subtle px-4 py-3 text-sm text-danger-ink'
          : 'mb-6 flex animate-ems-up gap-3 rounded-lg border border-warn/50 bg-warn-subtle px-4 py-3 text-sm text-warn-ink'
      }
    >
      <span className="mt-px flex-none">{icon}</span>
      <p>{children}</p>
    </div>
  )
}

function Sent({ child, reach }: { child: string; reach: string }) {
  return (
    <Panel className="mx-auto max-w-xl p-7 text-center @xl/apply:p-10">
      <CircleCheck className="mx-auto size-12 text-success" strokeWidth={1.8} />
      <h2 className="mt-4 font-heading text-2xl font-extrabold tracking-[-0.01em]">
        Application received
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Thank you. The admissions office will review {child}&apos;s application and contact the
        family at <span className="font-semibold text-foreground">{reach}</span>.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/sign-in">Back to sign in</Link>
      </Button>
    </Panel>
  )
}
