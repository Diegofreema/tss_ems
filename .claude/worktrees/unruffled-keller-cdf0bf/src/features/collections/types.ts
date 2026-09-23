import type { Paginated } from '../../api/types.ts'
import type { Choice, OptionsKey } from './options.ts'
import type { Align, CardRole } from '@/lib/table.ts'

/**
 * Every static list route across the portals. Spelling them out keeps
 * `Link to={definition.path}` type-checked — a typo here is a compile error,
 * not a dead link.
 */
export type ListPath =
  | '/admin/fees'
  | '/admin/collect'
  | '/admin/invoices'
  | '/admin/spendings'
  | '/admin/students'
  | '/admin/applicants'
  | '/admin/attendance'
  | '/admin/staff'
  | '/admin/staff-admin'
  | '/admin/staff-teachers'
  | '/admin/staff-other'
  | '/admin/parents'
  | '/admin/parents-invited'
  | '/admin/classes'
  | '/admin/arms'
  | '/admin/subjects'
  | '/admin/calendar'
  | '/admin/terms'
  | '/admin/timetable'
  | '/admin/results'
  | '/admin/result-queue'
  | '/admin/library'
  | '/admin/notices'
  | '/admin/logs'
  | '/teacher/subjects'
  | '/teacher/students'
  | '/teacher/topics'
  | '/teacher/eclasses'
  | '/teacher/uploads'
  | '/teacher/results'
  | '/teacher/assignments'
  | '/teacher/submissions'
  | '/student/courses'
  | '/student/materials'
  | '/student/timetable'
  | '/student/assignments'
  | '/student/results'
  | '/student/attendance'
  | '/student/invoices'
  | '/parent/children'
  | '/parent/results'
  | '/parent/attendance'
  | '/parent/invoices'
  | '/parent/assignments'

/**
 * Where a portal keeps its generic record routes. Every portal mounts the same
 * three shapes, so one object per portal is all the components need to know.
 */
export type RecordPath =
  | '/admin/$collection/$recordId'
  | '/teacher/$collection/$recordId'
  | '/student/$collection/$recordId'
  | '/parent/$collection/$recordId'

/**
 * A portal whose records can be changed publishes all three routes. A
 * read-only portal publishes only `record`, so the components cannot link to
 * an edit or create page that does not exist for it.
 */
export type CollectionRoutes =
  | {
      record: RecordPath
      edit:
        | '/admin/$collection/$recordId/edit'
        | '/teacher/$collection/$recordId/edit'
      create: '/admin/$collection/new' | '/teacher/$collection/new'
      /** Where this portal mounts its guided flows, if it has any. */
      flow?: '/admin/$collection/action'
    }
  | { record: RecordPath; edit?: never; create?: never; flow?: never }

/**
 * Where a breadcrumb leads. A crumb naming a register links to it; one naming
 * a record — the edit page's does — links to the record it is editing.
 */
export type CrumbLink =
  | { to: ListPath; params?: never }
  | { to: RecordPath; params: { collection: string; recordId: string } }

/** Where a list's primary action goes when it is not a create form. */
export type ActionPath =
  | '/teacher/questions'
  | '/admin/arms'
  | '/admin/classes'
  | '/admin/calendar'
  | '/admin/terms'
  | '/admin/collect/report'
  | '/admin/collect/pupil'
  | '/parent/pay'
  | '/parent/children/add'
  | '/admin/collect'

/**
 * A guided flow a collection's records can be put through — allocating a fee
 * to class arms, reviewing an application. Only the button label lives here;
 * the flow itself is defined by the portal that mounts it.
 */
export type FlowSpec = {
  /**
   * Which of the collection's flows this is, and what the URL calls it. A
   * register usually has one; teachers have two — what they are trusted with,
   * and writing to them — and the flow page has to know which it was opened
   * for.
   */
  name: string
  /** Button label, e.g. "Allocate to classes". */
  label: string
  /** The flow needs no record, so the list's primary action opens it. */
  fromList?: boolean
  /**
   * Records this flow can be run against. A settled invoice cannot be paid
   * twice — the API refuses with 409 — so it gets no button rather than one
   * that always fails. A flow without this is offered on every record.
   */
  when?: (record: Row) => boolean
  /**
   * Whether this flow may be run at all — by the account signed in, on the
   * record in front of them. Separate from `when` on purpose: a record this
   * flow does not apply to is a different thing from one it is not permitted
   * on, and only the second is worth a locked page when the URL is typed out.
   */
  allowed?: (record?: Row) => boolean
  /**
   * Why it was refused, where the general sentence about privileges is not the
   * reason. Nothing means the reason is the ordinary one.
   */
  deniedBody?: (record?: Row) => string | undefined
}

/** Every fixture cell is display text; the API returns the same shape. */
export type Row = { id: string } & Record<string, string>

/** What a list asks for: one page, narrowed by the search box and the filters. */
export type ListParams = {
  page: number
  q: string
  /** Keyed by the query parameter the endpoint takes; empty means unset. */
  filters: Record<string, string>
}

/**
 * A dropdown beside the search box. `key` is the query parameter the endpoint
 * takes, and `label` doubles as the choice that clears it — "All classes".
 */
export type FilterSpec = {
  key: string
  label: string
  /**
   * A date range rather than a dropdown: `key` is the query parameter for the
   * first day and this one names the parameter for the last. One control
   * writes both, which is also what keeps them the right way round — the
   * ledger endpoint answers with nothing at all for a range given backwards
   * rather than swapping it.
   */
  until?: string
  options?: readonly Choice[]
  /** Reads the choices from the API, the same feeds the forms use. */
  optionsFrom?: OptionsKey
  /** Names the filter this one is scoped by; arms belong to a class. */
  dependsOn?: string
  /**
   * This filter swaps which records are listed rather than narrowing the ones
   * already there — staff are two separate registers, not one with a role
   * column. There is no unnarrowed total for the count beside the search to
   * measure against, so it reports matches alone.
   */
  replaces?: boolean
}

/**
 * Where a collection's rows come from. A definition that names one is read
 * from the API, paginated and searched by the server; one that does not falls
 * back to the rows written into the definition.
 */
export type ListSource = (params: ListParams) => Promise<ListResult>

/**
 * A page of rows, and optionally a figure the endpoint worked out over
 * everything the filters match rather than over the page it sent — the
 * ledger's `total_amount`. Absent where the endpoint offers none, or where
 * there is nothing narrowing the list for it to be about.
 */
export type ListResult = Paginated<Row> & { tally?: number }

/**
 * A control on every row of a list, beside the link into the record — a state
 * a register turns on and off rather than edits, like suspending a pupil.
 *
 * Every part is read off the row, so one spec covers both directions of a
 * state that toggles: the button offers whichever of the two the record is
 * not currently in.
 */
export type RowActionSpec = {
  /** What the button says for this row. Nothing at all leaves the row alone. */
  label: (row: Row) => string | undefined
  /**
   * The confirm's body. Without one the action runs on the first click, which
   * is right for putting a state back and wrong for taking it away.
   */
  confirm?: (row: Row) => string | undefined
  /** What the toast says once the API has taken it. */
  done: (row: Row) => string
  /**
   * The dialog's heading and its button, where the label does not read as a
   * verb. "Withdraw" composes into "Withdraw this subject?" on its own; "Make
   * current" does not, and the row button is the wrong place to fix that.
   */
  title?: (row: Row) => string
  cta?: (row: Row) => string
  run: (row: Row) => Promise<unknown>
}

/**
 * A link on every row, beside the way into the record — for a row that leads
 * somewhere rather than one that changes.
 *
 * Unlike `rowAction` nothing is written, so there is no confirm and no toast:
 * the page it lands on is where the decision is taken. A collection may have
 * one or the other, not both — they share the row's one control.
 */
export type RowLinkSpec = {
  /** What the button says for this row. Nothing at all leaves the row alone. */
  label: (row: Row) => string | undefined
  to: ActionPath
  /** Preset filters, read straight off the URL by the page it lands on. */
  search?: (row: Row) => Record<string, string>
}

/**
 * A summary tile whose figure arrives with the page rather than from its own
 * endpoint, so it moves as the list is narrowed. `source` supplies the number;
 * a page that sends none shows no tile.
 */
export type TallyTile = {
  label: string
  format?: (value: number) => string
}

/** A summary tile whose figure the API is asked for rather than written down. */
export type CountTile = {
  label: string
  count: () => Promise<number>
  /** How the figure reads. Defaults to a plain count; a ledger wants money. */
  format?: (value: number) => string
}

export type ColumnSpec = {
  key: string
  label: string
  align?: Align
  /** Renders the value as a status tag, coloured by meaning. */
  tag?: boolean
  /** The value is a stored filename; the cell fetches and saves it. */
  download?: boolean
  /** The value is a URL somewhere else — a meeting room — and opens in a tab. */
  link?: boolean
  cardRole?: CardRole
}

/**
 * One row of the record panel. A plain field reads as label and value side by
 * side; a `rich` one is drawn as the body it is, under its own label; a `link`
 * one opens somewhere else in a new tab, as the same value does in the table.
 */
export type DetailFieldSpec = {
  key: string
  label: string
  rich?: boolean
  link?: boolean
}

export type FieldSpec = {
  key: string
  label: string
  required?: boolean
  /** Two grid columns; the design uses this for names and free text. */
  wide?: boolean
  placeholder?: string
  hint?: string
  options?: readonly Choice[]
  /**
   * Reads the choices from the API instead of listing them, so the form
   * submits the school's own ids. `dependsOn` names the field that scopes the
   * feed — an arm is only meaningful inside a class.
   */
  optionsFrom?: OptionsKey
  dependsOn?: string
  /**
   * Many of the feed at once, held as an array of ids — the fees a class is
   * charged. Only meaningful with `optionsFrom`.
   */
  multi?: boolean
  multiline?: boolean
  /**
   * A body rather than a line: headings, lists, emphasis and links, stored as
   * HTML. Spans the form whatever `wide` says — a scheme of work written into
   * half a row is a textarea with a toolbar on it.
   */
  rich?: boolean
  numeric?: boolean
  /**
   * A figure rather than text: the browser's own number control, which will
   * not take a word at all. `numeric` beside it is the looser rule — it
   * accepts the separators a phone number is written with — so a field that
   * counts something wants this one and a field that is merely digits wants
   * that one.
   */
  number?: boolean
  /** Bounds for a `number` field, enforced by the form as well as the control. */
  min?: number
  max?: number
  /** A figure in naira: masked as it is typed and spelled out beneath. */
  money?: boolean
  email?: boolean
  /**
   * An upload rather than typed text, and the `accept` attribute that narrows
   * the picker — `'image/*'` for a book's cover. The form holds the `File`
   * itself, so the collection's `save` must send multipart.
   */
  file?: string
  date?: boolean
  /** With `date`: the answer is already behind us, so the years read backwards. */
  past?: boolean
  /**
   * A time of day rather than a date — when a period starts, when it ends.
   * The browser's own clock control, which is the only one that speaks the
   * reader's 12- or 24-hour habit without being told. Stored and submitted as
   * `HH:MM`, which is what the timetable endpoint sends and takes.
   */
  time?: boolean
}

export type FormSectionSpec = {
  title: string
  fields: FieldSpec[]
  /**
   * Whether this section applies to what is being filled in. The staff form
   * writes to two different endpoints, and half its fields belong to only one
   * of them — asking an office record for a qualification it cannot store is
   * asking for something that will be thrown away.
   *
   * A conditional section's fields must be optional: the validator is built
   * from the whole definition, so a required field in a hidden section would
   * refuse the form for a reason nobody can see.
   */
  when?: (values: Record<string, unknown>) => boolean
}

/** A sub-table shown beside a record's fields on its detail page. */
export type DetailTab = {
  label: string
  columns: ColumnSpec[]
  /** Shown when the tab has no `source`; the fixture rows. */
  rows?: Row[]
  /** Reads the tab from the API for the record being looked at. */
  source?: (recordId: string) => Promise<Row[]>
  /** Shown in place of the table when the tab holds nothing. */
  empty?: string
  /**
   * Which records the tab belongs to. A register that mixes two populations
   * carries the tabs of both, and a tab that can never fill for the record in
   * front of you is worse than no tab: it reads as data that failed to load.
   */
  when?: (recordId: string) => boolean
  /**
   * A way out of the tab, where what it shows is kept somewhere else. A class
   * carries its timetable but does not own it — periods are their own
   * register — so the tab reads the week and hands the office over to where it
   * is changed, narrowed to the record they were already looking at.
   */
  action?: (recordId: string) => {
    label: string
    to: ListPath
    /** Preset filters, read straight off the URL by the list it lands on. */
    search?: Record<string, string>
  }
}

/**
 * One collection: its copy, its columns, its rows and the form used to create
 * or edit a record. Adding a list page means adding one of these.
 */
export type CollectionDef = {
  id: string
  path: ListPath
  kicker: string
  title: string
  description: string
  /** Primary action label, e.g. "Create fee". */
  action: string
  searchHint: string
  /**
   * False where the collection's endpoint takes no search term. A box that
   * accepts typing and narrows nothing is worse than no box.
   */
  searchable?: boolean
  footer: string
  /** Shown where the record asked for did not come back. */
  missingTitle?: string
  missingBody?: string
  emptyTitle: string
  emptyBody: string
  /** Singular noun used in delete confirms, e.g. "fee". */
  noun: string
  /**
   * The collection's records are not written from here. The portal publishes
   * create and edit routes for every collection, and two kinds of list must
   * offer neither: an append-only audit log, where a delete button would sit
   * on the entry recording the deletion, and a list whose records arrive from
   * outside — an application is submitted by a family, then decided on.
   *
   * A record-scoped flow still shows, since deciding about a record is not the
   * same as editing it.
   */
  readonly?: boolean
  summary?: { label: string; value: string }[]
  /**
   * Summary tiles the API counts, replacing `summary` where a collection has
   * one. Each tile names itself up front and asks for its number separately,
   * so the strip is the right shape before any of them answer.
   */
  counts?: readonly CountTile[]
  /**
   * One more tile, for the figure the list endpoint sends back with the page.
   * Unlike `counts` it answers for what the filters match, so it appears only
   * while the list is narrowed and the tiles above it no longer say it.
   */
  tally?: TallyTile
  columns: ColumnSpec[]
  /** The rows to show when the collection has no `source` of its own. */
  rows?: Row[]
  /** Dropdowns beside the search box. Only read by a collection with a `source`. */
  filters?: readonly FilterSpec[]
  /**
   * Reads this collection from the API instead of from `rows`, one page at a
   * time. `record` fetches a single row for the detail page, which cannot go
   * looking in a page it never loaded.
   */
  source?: ListSource
  record?: (recordId: string) => Promise<Row | undefined>
  /**
   * Writes the form back. `recordId` is absent when creating. A collection
   * without one keeps the prototype's toast, since it has no endpoint yet.
   */
  save?: (values: Record<string, unknown>, recordId?: string) => Promise<unknown>
  /**
   * Deletes a record, from its row and from its edit form. A collection
   * without one keeps the prototype's toast, since it has no endpoint yet.
   */
  remove?: (recordId: string) => Promise<unknown>
  /**
   * Whether this record may be deleted by the person signed in. Only the API
   * can enforce it; this is what stops the button being offered where it will
   * come back refused — an office record can only be deleted by a super
   * administrator, and the teaching record beside it by anyone.
   */
  removeWhen?: (row: Row) => boolean
  /**
   * What the delete confirm says, in place of the generic sentence. Set where
   * other records depend on this one and the API will refuse: the dialog is
   * where that belongs, not a toast after the button has been pressed.
   */
  removeBody?: (row: Row) => string
  /**
   * What the record panel lists. Defaults to the table's columns, which is
   * all a fixture row holds; a collection read from the API usually knows far
   * more about a record than the register has room to show.
   */
  detail?: DetailFieldSpec[]
  /** The column holding the record's name — used in titles and confirms. */
  nameKey: string
  /** A per-row control, offered on every row of the list. */
  rowAction?: RowActionSpec
  /** Where a row leads, where it leads anywhere. See `RowLinkSpec`. */
  rowLink?: RowLinkSpec
  form?: FormSectionSpec[]
  /** Sub-tables on the detail page. Defaults to the record's activity. */
  tabs?: DetailTab[]
  /**
   * Distinguishes two definitions that share a path but hold different rows —
   * the parent portal scopes most of its lists to the selected child.
   */
  scope?: string
  /**
   * Sends the primary action somewhere other than a create form. Only read
   * from in portals that publish no create route.
   */
  actionTo?: ActionPath
  /**
   * A second destination beside the primary one, as an outline button. The
   * counter queue has two jobs off it that are not each other — looking a
   * family up, and reconciling the day's takings — and burying either one
   * inside the other would be inventing a hierarchy the work does not have.
   */
  secondaryTo?: { to: ActionPath; label: string }
}
