import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import type { ProfilePref } from '../types'

/** Which messages the school sends, and how. Held on the page, not the server. */
export function ContactPrefs({ prefs }: { prefs: ProfilePref[] }) {
  const [on, setOn] = useState(() => prefs.map((pref) => pref.on))

  return (
    <div className="flex flex-col gap-3">
      {prefs.map((pref, index) => (
        <label
          key={pref.label}
          className="flex cursor-pointer items-start gap-3 text-sm leading-normal"
        >
          <Checkbox
            checked={on[index]}
            onCheckedChange={(checked) =>
              setOn((previous) =>
                previous.map((value, i) => (i === index ? checked === true : value)),
              )
            }
            className="mt-0.5 flex-none"
          />
          <span>
            <span>{pref.label}</span>
            <span className="mt-0.5 block text-2xs text-muted-foreground">
              {pref.hint}
            </span>
          </span>
        </label>
      ))}
    </div>
  )
}
