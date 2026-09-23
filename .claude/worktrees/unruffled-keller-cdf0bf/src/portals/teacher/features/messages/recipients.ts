import type {
  TeacherClassArm,
  TeacherRoll,
  TeacherStudent,
} from '../../../../api/teaching/types.ts'
import { fullName } from '../../../../features/profile/record.ts'

/**
 * Who a teacher may write to, off `GET /teachers/me/students`.
 *
 * One call answers both halves the picker needs: `class_arms` is every arm the
 * teacher takes and `students` is the roll across all of them, each pupil
 * carrying the `class_arm_id` they sit in. So the arms are not asked for
 * separately, and an arm the teacher takes but which holds nobody still
 * appears — it comes off `class_arms`, where a pupil-less arm is listed all
 * the same.
 *
 * `/teachers/me/eclasses` is not this list: it is the teacher's video meeting
 * links, and holds no pupils at all.
 */

/** An arm on the picker: what it is called, and how many pupils it holds. */
export type ArmOption = {
  value: string
  label: string
  count: number
}

/** One pupil, as the picker lists them. */
export type Recipient = {
  id: number
  name: string
  /** The admission number, or a stand-in, so two of a name are told apart. */
  adm: string
  armId: number | null
}

const spaceless = (value: string) => value.toLowerCase().replace(/\s+/g, '')

/**
 * The arm's name with its class in front, unless the school already put it
 * there.
 *
 * Bronze holds an arm named "JSS1 A" under the class "JSS 1" — the class twice
 * over once the two are joined, and the repeat only shows if the spaces are
 * ignored. It also holds one named plainly "A", which says nothing without its
 * class in front. Both are the school's own entries, so neither is corrected
 * here; the label just stops short of saying the same thing twice.
 */
export function armLabel(arm: TeacherClassArm): string {
  const name = arm.arm_name?.trim() || `Arm ${arm.id}`
  const klass = arm.department?.name?.trim()
  if (!klass || spaceless(name).includes(spaceless(klass))) return name
  return `${klass} · ${name}`
}

export function recipientOf(pupil: TeacherStudent): Recipient {
  return {
    id: pupil.id,
    name: fullName(pupil.fname, pupil.mname, pupil.lname) || `Pupil ${pupil.id}`,
    // Not every pupil has one, and this is what tells two of a name apart.
    adm: pupil.regno?.trim() || `Pupil ${pupil.id}`,
    armId: pupil.class_arm_id ?? null,
  }
}

/** Every arm the teacher takes, each carrying how many pupils sit in it. */
export function armOptions(roll: TeacherRoll): ArmOption[] {
  return roll.class_arms.map((arm) => ({
    value: String(arm.id),
    label: armLabel(arm),
    count: roll.items.filter((pupil) => pupil.class_arm_id === arm.id).length,
  }))
}

/** The roll of one arm, in the order the school sent it. */
export function recipientsIn(roll: TeacherRoll, armId: number): Recipient[] {
  return roll.items
    .filter((pupil) => pupil.class_arm_id === armId)
    .map(recipientOf)
}

/**
 * The pupils a search box is asking for.
 *
 * Matched on the name and the admission number both, because a teacher looking
 * for one pupil in a full arm reaches for whichever they have to hand.
 */
export function matching(pupils: Recipient[], query: string): Recipient[] {
  const term = query.trim().toLowerCase()
  if (!term) return pupils
  return pupils.filter(
    (pupil) =>
      pupil.name.toLowerCase().includes(term) || pupil.adm.toLowerCase().includes(term),
  )
}

/** Adds a pupil to the selection, or takes them out of it. */
export function toggled(chosen: number[], id: number): number[] {
  return chosen.includes(id) ? chosen.filter((one) => one !== id) : [...chosen, id]
}

/**
 * The selection with everyone shown added, or — where they are all already in
 * it — with everyone shown taken out.
 *
 * Scoped to what the search box has narrowed to rather than to the whole arm,
 * so "select all" after a search means the pupils on screen. Pupils chosen in
 * another arm are left alone: a message can go to a class captain from each.
 */
export function allToggled(chosen: number[], shown: Recipient[]): number[] {
  const ids = shown.map((pupil) => pupil.id)
  const every = ids.length > 0 && ids.every((id) => chosen.includes(id))
  if (every) return chosen.filter((id) => !ids.includes(id))
  return [...chosen, ...ids.filter((id) => !chosen.includes(id))]
}

/** e.g. "3 selected · 2 in this arm". */
export function selectionNote(chosen: number[], shown: Recipient[]): string {
  const here = shown.filter((pupil) => chosen.includes(pupil.id)).length
  const elsewhere = chosen.length - here
  const parts = [`${chosen.length} selected`]
  if (elsewhere > 0) parts.push(`${here} of them here`)
  return `${parts.join(' · ')} · ${shown.length} shown`
}
