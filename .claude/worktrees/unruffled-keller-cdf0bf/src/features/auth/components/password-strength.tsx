import { cn } from '@/lib/utils'
import { MINIMUM_SCORE, passwordScore, strengthLabel } from '../password'

/** Four segments plus a word. Ink once the password is acceptable, accent until then. */
export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password)
  const acceptable = score >= MINIMUM_SCORE

  return (
    <>
      <div className="mt-2.5 flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              'h-1 flex-1 transition-colors duration-200',
              index < score
                ? acceptable
                  ? 'bg-foreground'
                  : 'bg-brand'
                : 'bg-neutral-300',
            )}
          />
        ))}
      </div>
      <div
        className={cn(
          'mt-1.5 text-[11px]',
          password && !acceptable ? 'text-brand-700' : 'text-neutral-600',
        )}
      >
        {strengthLabel(password)}
      </div>
    </>
  )
}
