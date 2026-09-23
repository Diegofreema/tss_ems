import { CircleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils'

/**
 * The sign-in design's field: a label, a filled control with the icon that
 * says what goes in it, and the refusal underneath.
 *
 * Deliberately not `TextField`. The portals' fields are 32px controls on a
 * grey ground with a hint line under every one of them — a record form the
 * office fills in forty of. This is one field on a white page, and the two
 * looks have no more in common than the word "input", so sharing a component
 * between them would mean a variant flag on every rule in it.
 */
export function AuthField<TValues extends FieldValues>({
  name,
  label,
  placeholder,
  icon,
  type = 'text',
  autoComplete,
}: {
  name: Path<TValues>
  label: string
  placeholder?: string
  icon?: LucideIcon
  type?: 'text' | 'email' | 'password' | 'tel'
  autoComplete?: string
}) {
  const { control } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <AuthFieldShell name={name} label={label} error={error} icon={icon}>
      <input
        {...field}
        id={name}
        value={field.value ?? ''}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={fieldClasses(Boolean(icon), false, Boolean(error))}
      />
    </AuthFieldShell>
  )
}

/**
 * The same field with the eye in the corner.
 *
 * The toggle can be owned here or passed in, which is what the reset screen
 * needs: a new password and its repeat show and hide together, so somebody
 * checking what they typed does not have to ask twice.
 */
export function AuthPasswordField<TValues extends FieldValues>({
  name,
  label,
  placeholder,
  icon,
  autoComplete,
  visible,
  onToggle,
}: {
  name: Path<TValues>
  label: string
  placeholder?: string
  icon?: LucideIcon
  autoComplete?: string
  visible: boolean
  onToggle: () => void
}) {
  const { control } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <AuthFieldShell name={name} label={label} error={error} icon={icon}>
      <input
        {...field}
        id={name}
        value={field.value ?? ''}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={fieldClasses(Boolean(icon), true, Boolean(error))}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ui-hint transition-colors hover:text-ui-muted"
      >
        <EyeGlyph off={!visible} />
      </button>
    </AuthFieldShell>
  )
}

function AuthFieldShell({
  name,
  label,
  error,
  icon: Icon,
  children,
}: {
  name: string
  label: string
  error?: string
  icon?: LucideIcon
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-base font-medium">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute inset-y-0 left-4 my-auto size-5 text-ui-hint"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        )}
        {children}
      </div>
      {error && <AuthFieldError>{error}</AuthFieldError>}
    </div>
  )
}

/** The red line under a field. Also raised on its own for a whole-form refusal. */
export function AuthFieldError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-2 flex animate-ems-fade items-start gap-2 text-base text-ui-error"
    >
      <CircleAlert
        className="mt-0.75 size-4.5 flex-none fill-ui-error text-white"
        strokeWidth={2}
        aria-hidden="true"
      />
      <span>{children}</span>
    </div>
  )
}

/**
 * Filled while it is being written in, outlined in red once it has been
 * refused — the design swaps the fill for the page's own ground so the red
 * border reads as a border rather than a line around a grey box.
 */
function fieldClasses(hasIcon: boolean, hasToggle: boolean, invalid: boolean) {
  return cn(
    'h-(--auth-control) w-full rounded-md border bg-ui-field text-base text-ui-ink transition-colors outline-none placeholder:text-ui-hint focus-visible:border-ui-blue',
    hasIcon ? 'pl-12' : 'pl-4',
    hasToggle ? 'pr-12' : 'pr-4',
    invalid ? 'border-ui-error-line bg-ui-paper' : 'border-transparent',
  )
}

/**
 * Drawn here rather than taken from the icon set: the design's eye is a single
 * stroke with the slash always present, where lucide swaps one glyph for
 * another and the two have different widths — enough to shift the field's
 * right edge on every toggle.
 */
function EyeGlyph({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 20 20 4" />}
    </svg>
  )
}
