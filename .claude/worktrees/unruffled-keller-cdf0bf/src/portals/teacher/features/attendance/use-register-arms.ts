import { useMyRegisterClasses } from '@/api/attendance/hooks';
import { myClassOptions } from './register';

/**
 * The arms this teacher is class teacher of.
 *
 * Both attendance pages are asked one arm at a time and both are closed to a
 * subject teacher, so both read the same list and fall back to the same first
 * arm when the URL names none.
 */
export function useRegisterArms(selected: string) {
  const classes = useMyRegisterClasses();
  const arms = myClassOptions(classes.data);

  return {
    arms,
    armId: Number(selected) || arms[0]?.id || 0,
    pending: classes.isPending,
    // A 404 here is the answer, not a failure: this teacher is class teacher
    // of no arm at all.
    none: Boolean(classes.error) || arms.length === 0,
  };
}
