import { timetablesService } from '@/api/timetables/service'
import type { DayName } from '@/api/timetables/types'
import { pageRows } from '@/features/collections/api'
import type { CollectionDef } from '@/features/collections/types'
import { queryClient } from '@/lib/query-client'
import { periodBody, periodDeleteBody, periodEditBody, periodRow } from './period-row'

/**
 * The school's week, period by period, off `GET /timetables`.
 *
 * A register rather than a grid: the office builds a timetable one slot at a
 * time, and a slot is what it edits, moves and takes away. The grid is what a
 * pupil reads — `/student/timetable` draws it from the same periods.
 *
 * A period is a subject. The endpoint also takes a bare `title` for a slot
 * that is not one — Break, Assembly — and the office does not set those here;
 * the subject is required instead, which is the same rule the API's 422 states
 * and one less empty box on the form.
 *
 * An overlapping slot is refused with 409, and that is not re-checked here:
 * it is the school's rule about the school's own data, the API says it in its
 * own words, and a second copy in the form would be the one that fell out of
 * date.
 */

/** Monday first. The school teaches five, and the API offers all seven. */
const DAYS: readonly DayName[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

/** Every period on one page — a school's week runs to dozens, not thousands. */
const ALL_PERIODS = 500

function asId(value: string | undefined) {
  return Number(value) || undefined
}

/**
 * The whole week in one cached answer, for the tiles above the register.
 *
 * Two of the three figures are counted over every period rather than the page
 * on screen, and neither has an endpoint of its own — so this is asked for
 * once and the three tiles read it between them.
 */
const week = () =>
  queryClient.ensureQueryData({
    queryKey: ['timetables', 'census'],
    queryFn: () => timetablesService.periods({ limit: ALL_PERIODS }),
  })

const distinct = (values: (number | null | undefined)[]) =>
  new Set(values.filter((value) => value != null)).size

export const timetable: CollectionDef = {
  id: 'timetable',
  path: '/admin/timetable',
  kicker: 'Academics',
  title: 'Timetable',
  description:
    'Every period the school teaches, class by class. A period is one subject, on one day, between two times — add them here and each class’s week builds itself.',
  action: 'Add period',
  searchHint: 'Search subject, class or day',
  footer: 'Every period on record, across all classes',
  emptyTitle: 'No periods yet',
  emptyBody:
    'Nothing appears on a pupil’s timetable until the office adds periods here. Add the first one and it shows on that class’s week straight away.',
  noun: 'period',
  nameKey: 'subject',
  counts: [
    { label: 'Periods', count: async () => (await week()).pagination.total },
    {
      label: 'Classes timetabled',
      count: async () => distinct((await week()).periods.map((period) => period.department_id)),
    },
    {
      label: 'Subjects taught',
      count: async () => distinct((await week()).periods.map((period) => period.subject_id)),
    },
  ],
  filters: [
    { key: 'department_id', label: 'All classes', optionsFrom: 'classes' },
    { key: 'day_of_week', label: 'Any day', options: DAYS },
  ],
  columns: [
    { key: 'klass', label: 'Class', cardRole: 'title' },
    { key: 'day', label: 'Day', cardRole: 'subtitle' },
    { key: 'time', label: 'Time' },
    { key: 'subject', label: 'Subject', cardRole: 'tag' },
  ],
  detail: [
    { key: 'subject', label: 'Subject' },
    { key: 'klass', label: 'Class' },
    { key: 'day', label: 'Day' },
    { key: 'time', label: 'Time' },
    { key: 'session', label: 'Session' },
    { key: 'term', label: 'Term' },
  ],
  // No tabs: a period holds nothing. It is a slot in a week, and the API keeps
  // no record of who set it or when it last moved.
  tabs: [],
  // The endpoint takes no search term — `q` and `search` both come back with
  // every row — so the filters go to the server and the words are matched
  // here, over the whole filtered set rather than the page on screen.
  //
  // ponytail: the filtered set is fetched whole and paged in the browser. A
  // school's week runs to a few hundred periods and this is one small request;
  // a school past `ALL_PERIODS` wants the endpoint taught to search instead.
  source: async (params) => {
    const { periods } = await timetablesService.periods({
      limit: ALL_PERIODS,
      department_id: asId(params.filters.department_id),
      day_of_week: params.filters.day_of_week as DayName | undefined,
    })
    return pageRows(periods.map(periodRow), params)
  },
  record: async (recordId) => periodRow(await timetablesService.period(recordId)),
  save: (values, recordId) =>
    recordId
      ? timetablesService.editPeriod(recordId, periodEditBody(values))
      : timetablesService.addPeriod(periodBody(values)),
  remove: (recordId) => timetablesService.removePeriod(recordId),
  removeBody: periodDeleteBody,
  form: [
    {
      title: 'When and for whom',
      fields: [
        {
          key: 'department_id',
          label: 'Class',
          required: true,
          optionsFrom: 'classes',
          hint: 'The whole class sits the period. Two classes on this school share a name, so pick by the one the register shows.',
        },
        { key: 'day_of_week', label: 'Day', required: true, options: DAYS },
        {
          key: 'start_time',
          label: 'Starts',
          required: true,
          time: true,
          hint: 'The school’s own clock. A slot that overlaps one this class already has is refused.',
        },
        { key: 'end_time', label: 'Ends', required: true, time: true },
      ],
    },
    {
      title: 'What is taught',
      fields: [
        {
          key: 'subject_id',
          label: 'Subject',
          required: true,
          wide: true,
          optionsFrom: 'subjects',
          hint: 'The subject taught in this slot. Only subjects the school currently offers are listed.',
        },
      ],
    },
    {
      title: 'Which term',
      fields: [
        {
          key: 'session_id',
          label: 'Session',
          optionsFrom: 'sessions',
          hint: 'Leave both empty for the term the school is in now, which is what a new period nearly always wants.',
        },
        { key: 'semester_id', label: 'Term', optionsFrom: 'terms' },
      ],
    },
  ],
}
