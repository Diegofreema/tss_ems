import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { passwordRules } from '../password'

/** The live checklist, ticked as the new password satisfies each rule. */
export function PasswordRules({ password }: { password: string }) {
  return (
    <div className="border-2 border-divider p-4">
      <div className="text-[10px] uppercase tracking-[0.1em] text-neutral-600">
        A password the school will accept
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {passwordRules(password).map((rule) => {
          const Icon = rule.passed ? Check : Minus
          return (
            <div
              key={rule.label}
              className={cn(
                'flex items-center gap-2.5 text-[13px]',
                rule.passed ? 'text-foreground' : 'text-neutral-600',
              )}
            >
              <Icon className="size-3.5 flex-none" strokeWidth={2.4} />
              <span>{rule.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
