import type { ConfirmTone } from '@/components/feedback/confirm-tone.ts'
import type { Paginated } from '../../api/types.ts'
import type { LocalFirstBinding } from './local-first.ts'
import type { Choice, OptionsKey , SearchKey } from './options.ts'
import type { Align, CardRole } from '@/lib/table.ts'
import type { WriteOutcome } from '../../db/write-outcome.ts'

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
  | '/admin/lending'
  | '/admin/notices'
  | '/admin/logs'
  | '/teacher/subjects'
  | '/teacher/students'
  | '/teacher/eclasses'
  | '/teacher/uploads'
  | '/teacher/results'
  | '/teacher/assignments'
  | '/teacher/submissions'
  | '/student/courses'
  | '/student/library'
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
 * a register turns on and off rather than edits, like suspending a student.
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
   * is right where nothing about the row changes for the person it belongs to.
   */
  confirm?: (row: Row) => string | undefined
  /**
   * How that confirm is dressed. Defaults to danger; a row action that gives
   * something back rather than taking it away asks in the brand colour.
   */
  tone?: (row: Row) => ConfirmTone
  /** What the toast says once the API has taken it. */
  done: (row: Row) => string
  /**
   * The dialog's heading and its button, where the label does not read as a
   * verb. "Withdraw" composes into "Withdraw this subject?" on its own; "Make
   * current" does not, and the row button is the wrong place to fix that.
   */
  title?: (row: Row) => string
  cta?: (row: Row) => string
  run?: (row: Row) => Promise<unknown>
  /**
   * Runs it through the durable outbox, as `queue` writes a form through it.
   * Present instead of `run`, never beside it.
   *
   * Only worth giving to a register that already reads off the device: a queued
   * action on a register that cannot be read with no connection is a button on
   * a row nobody can see.
   */
  queueRun?: (row: Row) => WriteOutcome | void | Promise<WriteOutcome | void>
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

/** See `FieldSpec.template`. */
export type FileTemplate = {
  label: string
  /** Reads the form as it stands: the arm chosen decides whose names go in it. */
  build: (values: Record<string, unknown>) => Promise<{ file: Blob; filename: string }>
  /** Sat under the button, saying what the file is for. */
  note?: string
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
   * Like `optionsFrom`, but the feed is searched a keystroke at a time rather
   * than opened whole — for a list too long to scroll, e.g. every guardian, or
   * one whose whole point is that it is not loaded whole, e.g. the book
   * catalogue at a lending counter. The field submits the record's id all the
   * same, and which parameter the endpoint is asked with is the feed's own
   * business — `q` at every one of them now, though it means "title, author
   * or ISBN" at the catalogue and "name" at the two directories.
   */
  searchFrom?: SearchKey
  /**
   * The row key holding the chosen record's name, so an edit shows it before a
   * search that would find it has been run. Only meaningful with `searchFrom`.
   */
  searchLabelKey?: string
  /**
   * Keeps what is typed into a searched field in the page's URL, under this
   * key — so the search survives a reload and can be linked to.
   *
   * The route must declare the key in its own `validateSearch` or the router
   * strips it back out, and no two fields on one form may share a key. Only
   * meaningful with `searchFrom`.
   */
  searchParam?: string
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
  /**
   * An address, and it must be one. For a box that genuinely holds a login —
   * a guardian's household, a staff account — where anything that is not an
   * address is an account nobody can sign in to.
   */
  email?: boolean
  /**
   * An address **or** whatever else the school has for this person.
   *
   * The student's box is the case it exists for. A child enrolling at a
   * Nigerian school very often has no address of their own, and the school
   * issues the username itself rather than making one out of this field — of
   * four students read off bronze, two sign in with an address that is not the
   * one on their record and the test login on file is a registration number.
   * So the box is a contact detail, not a credential, and refusing
   * `UDOYE2608264308` refuses something the school itself wrote.
   *
   * A value carrying an `@` is still checked, because there is only one reason
   * to type one and a half-finished address is a bounced invoice rather than a
   * username. Everything without one is taken as written.
   */
  emailOrUsername?: boolean
  /**
   * An upload rather than typed text, and the `accept` attribute that narrows
   * the picker — `'image/*'` for a book's cover. The form holds the `File`
   * itself, so the collection's `save` must send multipart.
   */
  file?: string
  /**
   * A starting file the reader can download, for an upload whose shape the
   * endpoint will not describe. Built when the button is pressed, from the
   * form's own values, so it can be filled in with what has been chosen so far.
   */
  template?: FileTemplate
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
  /**
   * A day **and** a time — when an assignment opens, when it shuts. The
   * browser's own `datetime-local` control.
   *
   * Held and submitted as the control's own `YYYY-MM-DDTHH:MM`, a string
   * throughout: `date` hands the form a `Date`, which has to be read back
   * through the reader's timezone on the way out, and a window is a wall
   * clock the school and the reader have to agree on to the minute. See
   * `toDateTimeInput` and `toSchoolStamp` in `when.ts`.
   */
  datetime?: boolean
  /**
   * With `datetime`: the field this one must not fall before — an assignment
   * that shuts before it opens is a window nobody can sit. Names the other
   * field's key; the message is written from that field's own label.
   */
  after?: string
  /**
   * Whether this field applies to **this record**, asked once when the form
   * opens rather than on every keystroke.
   *
   * The record, not the form's values — that is what makes it safe where the
   * section-level `when` is not. A section that appears and disappears as
   * somebody types cannot carry a required field, because the validator is
   * built from the whole definition and would refuse the form for a box
   * nobody can see; a field withheld on the strength of the record is
   * withheld for the life of the form, so it can be dropped from the
   * validator with it.
   *
   * What it exists for: a school that will not take a field on this
   * particular row. An assignment a class has begun handing in accepts only
   * the fields named in `editable_when_locked`, and asking a teacher to fill
   * in a compulsory box whose value is then discarded is worse than not
   * asking at all.
   */
  when?: (record?: Row) => boolean
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

/**
 * How a tab is drawn when its rows are bodies rather than figures.
 *
 * A table is the right shape for a column of marks and the wrong one for a
 * column of prose: the useful field is the one an ellipsis cuts, and a cell
 * wide enough not to cut it scrolls the frame sideways on a phone. Naming the
 * keys here turns the tab into panels that open instead.
 */
export type AccordionSpec = {
  /** Row key for the panel's heading — the whole heading, and it wraps. */
  title: string
  /** Row key for the body it opens onto. Rich text is drawn as written. */
  body: string
  /** Row key for a quieter line under the heading — a date, a count. */
  meta?: string
  /** What an empty body says, in place of the panel's contents. */
  empty?: string
  /** What the link to the row's own record is called, where it has one. */
  openLabel?: string
}

/** A sub-table shown beside a record's fields on its detail page. */
export type DetailTab = {
  label: string
  /**
   * Optional only because an `accordion` tab draws no columns. A tab with
   * neither draws an empty table, which is a definition with something
   * missing rather than a shape anything wants.
   */
  columns?: ColumnSpec[]
  /** Draws the rows as panels that open rather than as a table. */
  accordion?: AccordionSpec
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
  /**
   * A way to add to what the tab shows, for rows that are written from here
   * rather than only read from somewhere else. `collection` names the
   * definition whose create form opens and `values` seeds it, so a topic
   * added from a subject's page arrives with that subject already chosen.
   *
   * Beside `action` rather than a shape of it: one hands the reader over to
   * the register that owns these rows, the other starts a new one here —
   * which is the whole point for a record that has no register of its own.
   */
  add?: (recordId: string) => {
    label: string
    collection: string
    values?: Record<string, string>
  }
  /**
   * Where one row of the tab leads. A tab whose rows are worked on rather than
   * read — a submission is marked — sends the teacher to the row they picked
   * instead of to the list it is in, which is the same page reached two clicks
   * later after finding the row again.
   *
   * The record's own id is passed as well as the row: what a sub-table's row
   * means is usually a pair, and a submission is only reachable through the
   * assignment it was sent against.
   */
  rowTo?: (
    recordId: string,
    row: Row,
  ) => { to: ListPath; search?: Record<string, string> }
  /**
   * The same, for a tab whose rows *are* records — one opens its own page
   * rather than a register narrowed to it. `rowTo` cannot say this: it names
   * a `ListPath`, and a topic has no register to be narrowed. Beside it
   * rather than a shape of it, so nothing already written has to change.
   */
  rowRecord?: (recordId: string, row: Row) => { collection: string; recordId: string }
}

/**
 * One collection: its copy, its columns, its rows and the form used to create
 * or edit a record. Adding a list page means adding one of these.
 */
export type CollectionDef = {
  id: string
  path: ListPath
  /**
   * What the way back to `path` is called, where `path` is not this
   * collection's own register. Topics are read and written from the subject
   * they were taught for and have no register of their own, so "Back to
   * topics taught" would name a page that does not exist — the way back is
   * the subjects the topics hang off.
   */
  homeLabel?: string
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
  emptyTitle: string
  emptyBody: string
  /** Singular noun used in delete confirms, e.g. "fee". */
  noun: string
  /**
   * A record too thin for a page of its own — a handful of fields, no
   * sub-tables. The register opens it in a modal over the list instead,
   * carried as `?record=` so it still deep-links and the back button closes
   * it; the old record URL redirects there. Only a collection whose list is a
   * `CollectionPage` can say this — a bespoke list has nowhere to hang it.
   */
  modal?: boolean
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
   * Reads this collection off the device instead of over the network.
   *
   * The local-first path. Present means the register is drawn from a TanStack
   * DB collection with a live query, so it opens with no connection and
   * redraws by itself when a sync — or a write coming off the outbox — changes
   * what is stored. Absent means the query path below, unchanged.
   *
   * `source` and `record` are still read, by everything that is not the
   * register itself: the record modal, the route loaders and the sub-tables.
   * A definition that binds one of these should point both at the same
   * collection, which is what `mine.ts` does for the teacher.
   *
   * A definition carrying `filters` must give the binding a `narrow`, or the
   * dropdowns beside the search box would quietly do nothing: only a filter
   * already worked out on the rows can move to the device, since one the
   * endpoint narrows by would need the set to hold every answer it could give.
   */
  collection?: LocalFirstBinding
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
   * Writes the form back through the durable outbox instead of over the wire.
   *
   * Present instead of `save`, never beside it — a definition has one write
   * path, and two would be two things to keep in step. It returns nothing and
   * returns at once: the write is accepted on the device and sent when there is
   * somewhere to send it, so there is no answer to wait for and no refusal to
   * catch. The queue raises its own toast, which is why a queued definition
   * gets none from the mutation cache.
   */
  /**
   * May be async, and is awaited. Queueing is synchronous in itself, but a
   * write can need something off the device before it has a body — enrolling a
   * student reads which session the school is in — and the form must not close
   * before the op is written down.
   */
  queue?: (
    values: Record<string, unknown>,
    recordId?: string,
  ) => WriteOutcome | void | Promise<WriteOutcome | void>
  /**
   * Deletes a record, from its row and from its edit form. A collection
   * without one keeps the prototype's toast, since it has no endpoint yet.
   */
  remove?: (recordId: string) => Promise<unknown>
  /**
   * Deletes through the durable outbox, as `queue` writes through it. Present
   * instead of `remove`, never beside it.
   */
  queueRemove?: (recordId: string) => WriteOutcome | void | Promise<WriteOutcome | void>
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
