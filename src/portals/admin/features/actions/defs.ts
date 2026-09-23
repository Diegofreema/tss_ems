import { adminsService } from '@/api/admins/service';
import { classArmsService } from '@/api/class-arms/service';
import { collectFeesService } from '@/api/collect-fees/service';
import { departmentsService } from '@/api/departments/service';
import { feesService } from '@/api/fees/service';
import { libraryService } from '@/api/library/service';
import { studentsService } from '@/api/students/service';
import { subjectsService } from '@/api/subjects/service';
import { teachersService } from '@/api/teachers/service';
import { isSuperAdminRole } from '@/features/auth/role';
import { superAdminSignedIn } from '@/features/auth/session';
import { toApiDate } from '@/features/collections/date-range';
import type { Row } from '@/features/collections/types';
import {
  ADMIT,
  admission,
  type ReviewValues,
} from '@/portals/admin/collections/admission';
import { applicantDocuments } from '@/portals/admin/collections/applicant-row';
import { collectRequest, fineDue, returnRequest } from '@/portals/admin/collections/loan-row';
import { keyParts } from '@/features/library/loan-read';
import {
  collecting,
  figure,
  payAction,
  paymentBody,
} from '@/portals/admin/collections/collect-row';
import { parseStaffKey } from '@/portals/admin/collections/staff-row';
import { parseBatchId } from '@/portals/admin/collections/result-row';
import { resultsService } from '@/api/results/service';
import {
  moveOutcome,
  type MoveValues,
  studentMove,
} from '@/portals/admin/collections/student-move';
import { borrowBlock } from '@/features/library/loan-read';
import { searchedLabel } from '@/features/collections/option-feeds';
import { formatDate, formatNaira, parseNaira } from '@/lib/format';
import { dropMoneyReads } from '@/api/money';
import { queryClient } from '@/lib/query-client';
import type { ActionDef } from './types';

export type AdminFlow = {
  /** Which flow this is, and what `?flow=` in the URL calls it. */
  name: string;
  /** Button label on the record, e.g. "Allocate to classes". */
  label: string;
  /** The flow needs no record, so the list's primary action opens it. */
  fromList?: boolean;
  /** Records the flow can run against; offered on every record without it. */
  when?: (record: Row) => boolean;
  /** Whether it may be run at all — by this account, on this record. */
  allowed?: (record?: Row) => boolean;
  /** Why it was refused, where want of a privilege is not the reason. */
  deniedBody?: (record?: Row) => string | undefined;
  build: (row?: Row) => ActionDef | Promise<ActionDef>;
};

/** Everything on one page — a school has classes in the dozens. */
const ALL_CLASSES = 200;

/** Same again for the two registers a teacher's flows read whole. */
const ALL_SUBJECTS = 300;
const ALL_TEACHERS = 300;

const DASH = '—';

/** The student as the picker names them. */
function studentName(student: {
  fname: string;
  lname: string;
  mname?: string | null;
}) {
  return [student.fname, student.mname, student.lname]
    .filter(Boolean)
    .join(' ');
}

/**
 * Allocating a fee to classes.
 *
 * The design picks class arms; `POST /fees/{id}/allocate` takes classes and
 * levels, and knows nothing about arms — so the picker offers classes. Each
 * one is asked how many students it holds, because the whole point of this
 * screen is seeing what pressing the button will bill.
 *
 * Passing `departments` replaces the whole set, so the classes a fee is
 * already charged to arrive ticked: unticking one is how it is unallocated.
 */
async function allocate(row?: Row): Promise<ActionDef> {
  const amount = parseNaira(row?.amount ?? '');
  const classes = await departmentsService
    .list({ limit: ALL_CLASSES })
    .then((page) => page.items)
    .catch(() => []);

  const headcounts = await Promise.all(
    classes.map((department) =>
      studentsService
        .list({ department_id: department.id, status: 'Admitted', limit: 1 })
        .then((page) => page.pagination.total)
        .catch(() => 0),
    ),
  );

  return {
    kicker: 'Finance · Fee catalogue',
    title: `Allocate ${row?.name ?? 'this fee'}`,
    description:
      'Pick the classes this fee applies to. Invoices are raised for every student in them, at the amount on the fee.',
    summary: [
      { label: 'Fee', value: row?.name ?? DASH },
      { label: 'Per student', value: formatNaira(amount) },
      { label: 'Charged to', value: row?.charge ?? DASH },
    ],
    picker: {
      title: 'Classes',
      items: classes.map((department, index) => ({
        key: String(department.id),
        label: department.name,
        meta: `${headcounts[index]} ${headcounts[index] === 1 ? 'student' : 'students'}`,
        count: headcounts[index],
      })),
      // Unticking is how a class is dropped, so what it is already charged to
      // has to be on screen before anything is changed.
      preselected: row?.classIds
        ? row.classIds.split(',').filter(Boolean)
        : undefined,
      note: 'Unticking a class stops the fee applying to it. Invoices already raised are not touched.',
      requiredMessage: 'Pick at least one class to bill.',
    },
    fields: [],
    unitAmount: amount,
    cta: 'Allocate to these classes',
    footnote: 'Nothing is billed until you press this.',
    confirm: (total = { students: 0, amount: 0 }) => ({
      title: 'Allocate this fee?',
      body: 'Every student in the classes ticked is billed at the fee amount. Classes you unticked stop being charged, and invoices already raised are not touched.',
      subject: `${total.students} ${total.students === 1 ? 'student' : 'students'} · ${formatNaira(total.amount)} · ${row?.name ?? 'this fee'}`,
      cta: 'Allocate the fee',
      cancel: 'Go back',
    }),
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? [];
      await feesService.allocate(String(row?.id ?? ''), {
        departments: picked.map(Number),
      });
      return {
        message: `${row?.name ?? 'The fee'} allocated to ${picked.length} ${picked.length === 1 ? 'class' : 'classes'}`,
      };
    },
    done: (picked) =>
      `Fee allocated to ${picked} ${picked === 1 ? 'class' : 'classes'}`,
  };
}

/**
 * Taking a payment at the counter.
 *
 * `POST /collect-fees/{id}/pay` settles the invoice with no gateway involved,
 * and it insists that `amount + discount` equal the invoice exactly — there is
 * no part payment. So the flow does not ask what was collected: it asks what
 * was waived, and derives the rest. A clerk who could type both could type a
 * pair that does not add up, and would learn that from a 4xx.
 *
 * It always starts from an invoice, because the queue behind it searches by
 * student name and registration number: finding the bill is the search, and
 * looking at it before touching money is the point of the screen.
 */
function payment(row?: Row): ActionDef {
  const total = figure(row?.total);

  return {
    kicker: 'Finance · Fee collection',
    title: 'Take a payment',
    description:
      'Record money collected over the counter. The invoice is settled in full, less any discount granted — there is no part payment and no undoing it from here.',
    summary: [
      { label: 'Student', value: row?.student ?? DASH },
      { label: 'Reg. no.', value: row?.regno ?? DASH },
      { label: 'Fee', value: row?.fee ?? DASH },
      { label: 'Invoice', value: formatNaira(total) },
    ],
    fields: [
      {
        key: 'payment_method',
        label: 'How it was paid',
        required: true,
        optionsFrom: 'payment-methods',
        hint: "The school's own list, not a fixed one.",
      },
      {
        key: 'discount',
        label: 'Discount granted (₦)',
        money: true,
        placeholder: '0',
        hint: 'Leave empty to collect the invoice in full.',
      },
      {
        key: 'notes',
        label: 'Note',
        wide: true,
        multiline: true,
        placeholder: 'Transfer ref 99881',
        hint: 'The teller number or transfer reference. Kept on the payment.',
      },
    ],
    // What the clerk will actually take, recomputed as the discount is typed.
    tally: (values) => {
      const { amount, discount } = collecting(total, values.discount);
      return [
        { label: 'Discount', value: formatNaira(discount) },
        { label: 'To collect', value: formatNaira(amount) },
      ];
    },
    cta: 'Record payment',
    footnote: 'Nothing is collected until you press this.',
    confirm: (_total, values) => {
      const { amount, discount } = collecting(total, values?.discount);
      return {
        title: 'Record this payment?',
        body: 'This settles the invoice outright and writes the transaction against your name. There is no undoing it from here.',
        // The student, the fee and the figure — the three things a counter
        // checks before the money is committed to the wrong bill.
        subject: [
          row?.student,
          row?.fee,
          formatNaira(amount),
          discount ? `less ${formatNaira(discount)}` : undefined,
        ]
          .filter(Boolean)
          .join(' · '),
        cta: 'Record the payment',
        cancel: 'Go back',
      };
    },
    run: async (values) => {
      const body = paymentBody(total, values);
      const { transaction } = await collectFeesService.pay(
        String(row?.id ?? ''),
        body,
      );
      // The API mints the reference, and it is what a parent quotes back when
      // they query the payment, so the toast hands it over rather than the
      // fixed "Payment recorded" a `meta` would give.
      return { message: `Payment recorded — ${transaction.payref}` };
    },
    done: () => 'Payment recorded',
  };
}

async function promote(row?: Row): Promise<ActionDef> {
  const armId = row?.class_arm_id ?? '';
  const from = { departmentId: row?.department_id ?? '' };

  // Everyone in the student's own arm, plus anyone admitted into the class but
  // not yet placed — those are exactly the students this move can reach.
  const arm = armId
    ? await classArmsService.students(armId).catch(() => undefined)
    : undefined;
  const students = [
    ...(arm?.students ?? []),
    ...(arm?.unassigned_in_class ?? []),
  ];
  const names = new Map(
    students.map((student) => [student.id, studentName(student)]),
  );

  return {
    kicker: 'People · Student register',
    title: 'Promote or transfer students',
    description:
      'Pick where these students are going. Staying in the class moves them between arms; a different class promotes them. Results and invoices stay attached to the student, not the arm.',
    summary: [
      { label: 'From', value: row?.arm ?? DASH },
      { label: 'Class', value: row?.class ?? DASH },
      { label: 'Students here', value: String(students.length) },
    ],
    picker: {
      title: 'Students to move',
      items: students.map((student) => ({
        key: String(student.id),
        label: studentName(student),
        meta: student.regno ?? student.application_no ?? DASH,
        count: 1,
      })),
      preselected: row?.id ? [row.id] : undefined,
      note: 'Students who owe fees can still be moved; the debt follows them.',
      requiredMessage: 'Pick at least one student to move.',
    },
    fields: [
      {
        key: 'department_id',
        label: 'Move to class',
        required: true,
        optionsFrom: 'classes',
      },
      {
        key: 'class_arm_id',
        label: 'Move to arm',
        required: true,
        optionsFrom: 'arms',
        dependsOn: 'department_id',
        hint: 'The same class means a transfer between arms.',
      },
    ],
    cta: 'Move selected students',
    footnote: 'Written to the activity log against your name.',
    done: (picked) =>
      `${picked} ${picked === 1 ? 'student moved' : 'students moved'}`,
    run: async (values) => {
      const move = studentMove(values as unknown as MoveValues, from);
      const result =
        move.kind === 'transfer'
          ? await classArmsService.assignStudents(move.armId, move.body)
          : await studentsService.promote(move.body).then(() => undefined);

      return moveOutcome(
        move,
        result,
        (id) => names.get(id) ?? `Student ${id}`,
      );
    },
  };
}

function review(row?: Row): ActionDef {
  const documents = applicantDocuments(row);
  return {
    kicker: 'People · Applicants',
    title: `Review ${row?.name ?? 'application'}`,
    description:
      'Read the file, then admit into a class arm or decline. An admitted applicant joins the register straight away.',
    summary: [
      { label: 'Reference', value: row?.ref ?? DASH },
      { label: 'Applying to', value: row?.applying ?? DASH },
      { label: 'Submitted', value: row?.submitted ?? DASH },
    ],
    picker: {
      title: 'Documents on file',
      items: documents,
      // A document that was never supplied cannot have been seen.
      preselected: documents
        .filter((item) => item.count > 0)
        .map((item) => item.key),
      note: 'Tick the documents you have seen and verified.',
    },
    fields: [
      {
        key: 'decision',
        label: 'Decision',
        required: true,
        options: [ADMIT, 'Decline'],
      },
      {
        key: 'department_id',
        label: 'Admit into class',
        optionsFrom: 'classes',
        // Opens on the class the family applied for, which is usually the one.
        value: row?.department_id,
        requiredWhen: { field: 'decision', is: ADMIT },
      },
      {
        key: 'class_arm_id',
        label: 'Admit into arm',
        optionsFrom: 'arms',
        dependsOn: 'department_id',
        requiredWhen: { field: 'decision', is: ADMIT },
        hint: 'Arms belong to a class, so pick the class first.',
      },
    ],
    cta: 'Save decision',
    footnote: 'The applicant appears on the student register once admitted.',
    done: () => 'Decision saved',
    run: async (values) => {
      if (!row) throw new Error('That application could not be loaded.');
      const { body, message } = admission(row, values as ReviewValues);
      await studentsService.update(row.id, body);
      return { message };
    },
  };
}

/** The standard loan, and what the due date opens on. */
const LOAN_DAYS = 14;

function dueDate(days = LOAN_DAYS): Date {
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due;
}

/**
 * The picked title's own name, out of the searches the office ran to find it.
 *
 * It used to read the whole catalogue through `optionLabels('books')` and look
 * the id up in it. That was fine while the field was a dropdown of every
 * title — the list was loaded anyway — and is exactly what the searched field
 * exists to stop doing, so naming the book must not be what loads the
 * catalogue back in. `searchedLabel` reads the answers already in the query
 * cache, which by construction include the row that was picked.
 *
 * "The book" where it cannot: a flow left open until the cache was swept still
 * lends the copy, and a sentence that names the wrong title would be worse
 * than one that names none.
 */
function bookLabel(values?: Record<string, unknown>): string {
  return searchedLabel('books', String(values?.book_id ?? '')) ?? 'The book';
}

/**
 * Lending a copy to a student, via `POST /loanedbooks`.
 *
 * Runs from the register's own button — the library page is the loans now, so
 * the title is picked here rather than opened first. The student is searched
 * by name because the admitted register runs long and the student is standing at
 * the counter; what is submitted is still both ids. A loan is one copy of one
 * book, and the endpoint refuses with its own reason where the student already
 * has a book out, owes a fine, or no copy is on the shelf — none of that is
 * re-checked here.
 */
function lend(): ActionDef {
  return {
    kicker: 'School · Library',
    title: 'Issue a book',
    description:
      'Lend a copy to a student. Two weeks is the standard loan, and the date can be moved.',
    summary: [],
    fields: [
      {
        key: 'book_id',
        label: 'Book',
        required: true,
        wide: true,
        // Searched rather than listed. A catalogue is the one library list
        // that only grows, and opening a dropdown of every title to lend one
        // of them is the whole of it fetched to use a single row — so the
        // title is typed and `booktitle` narrows it at the endpoint. The term
        // is kept in the page's URL, so a reload at the counter does not lose
        // the search somebody is halfway through.
        searchFrom: 'books',
        searchParam: 'q',
        hint: 'Type a title to search what the library lends. Whether a copy is on the shelf is checked when you press the button.',
      },
      {
        key: 'student_id',
        label: 'Student',
        required: true,
        wide: true,
        searchFrom: 'students',
        hint: 'Type a name to search the admitted register; students are listed with their admission number.',
      },
      {
        key: 'datetoreturn',
        label: 'Due back',
        required: true,
        date: true,
        value: dueDate(),
      },
    ],
    cta: 'Issue book',
    footnote: 'The copy counts against the library until it is brought back.',
    done: () => 'Book issued',
    // Asked before the copy goes out: the loan is written against a named
    // student, and the dialog is the last chance to notice the wrong one. The
    // name is fetched rather than trusted from the form, so what the dialog
    // says is what the register holds — and the student's own history is asked
    // for its `may_borrow`, which is exactly what the contract publishes it
    // for, so a refusal is heard here rather than after the button.
    confirm: async (_total, values) => {
      const studentId = String(values?.student_id ?? '');
      const [student, history] = await Promise.all([
        studentsService.get(studentId).catch(() => null),
        libraryService.studentLoans(studentId).catch(() => null),
      ]);
      const name = student
        ? [student.fname, student.mname, student.lname]
            .filter(Boolean)
            .join(' ')
            .trim() || `Student ${student.id}`
        : 'the student picked';
      const due =
        values?.datetoreturn instanceof Date
          ? formatDate(values.datetoreturn)
          : null;
      /*
       * A refusal is a dead end, not a warning.
       *
       * It used to offer "Try anyway" beside a hedge — the school had already
       * said no, and the desk was invited to press on and be refused a second
       * time, in a toast, having lost the dialog that explained it. The flag is
       * the school's own answer about the school's own rule, so there is
       * nothing here for a librarian to overrule: no button is drawn, and the
       * way back is the only way.
       *
       * Only a flat "false" blocks. An answer without the flag, or no answer at
       * all, proves nothing, and the lend endpoint has its own refusal for
       * whatever this could not see.
       */
      const refusal = borrowBlock(history);
      return {
        title: refusal ? 'This action cannot be performed' : 'Issue this book?',
        body:
          refusal ||
          'The copy is written out against their name and counts against the library until it is brought back.',
        subject: [bookLabel(values), name, due ? `due ${due}` : undefined]
          .filter(Boolean)
          .join(' · '),
        cta: refusal ? undefined : 'Issue the book',
        cancel: 'Go back',
      };
    },
    run: async (values) => {
      const due = toApiDate(values.datetoreturn as Date | undefined);
      if (!due) throw new Error('Pick the date the book is due back.');
      /*
       * `POST /loanedbooks` — the book and the pupil both in the body now.
       *
       * The old address, `POST /admins/books/{id}/lend`, is retired and
       * answers 410 saying so, which is how the desk found out: it pressed
       * Issue and read the school's own sentence about a screen it was
       * standing in front of. That route wrote to a table with no penalty and
       * no paid column, so nothing lent through it could ever be fined.
       *
       * The due date is still sent rather than left to the school's default,
       * because the form asked for it and a desk that agreed a date with a
       * child has to be the one that decides it.
       */
      await libraryService.lend({
        student_id: Number(values.student_id),
        book_id: Number(values.book_id),
        toreturn: due,
      });
      const title = bookLabel(values);
      dropCatalogue();
      return { message: `${title} is out on loan.` };
    },
  };
}

/**
 * Drops the catalogue outright rather than marking it stale — the shelf that
 * reads it, and both pickers that offer it.
 *
 * Invalidating would now be enough — the shelf reads through
 * `queryClient.query`, which refetches what a write has invalidated — but a
 * title's standing is the one thing a librarian checks immediately after
 * changing it, and removing the entry means the next read waits for the API
 * rather than painting the old answer first.
 *
 * The pickers were dropped at two of the seven call sites and not the other
 * five, which was survivable while they were dropdowns with a five-minute
 * life. It is not now: the lending field searches the endpoint and holds each
 * answer under the term it was typed with, so a title retired on the shelf
 * would go on being offered at the counter for every term already searched.
 * All of it goes from one place, called wherever the catalogue is written.
 */
function dropCatalogue() {
  queryClient.removeQueries({ queryKey: ['library'] });
  queryClient.removeQueries({ queryKey: ['options', 'all-books'] });
  // Every term searched, not one: the office types a word at a time, so a
  // retired title sits in a dozen cached answers rather than one.
  queryClient.removeQueries({ queryKey: ['search', 'books'] });
}

/**
 * A new title on the shelf, via `POST /admins/books`.
 *
 * The catalogue lost its page when the register became the Library, so this
 * flow is what is left of it: the fields the endpoint takes, minus the cover
 * upload — nothing in the portal displays covers, and no title on record has
 * one. `isavailable` is not asked: a title being added is being added to lend,
 * and the endpoint's own default stands.
 */
function addTitle(): ActionDef {
  return {
    kicker: 'School · Library',
    title: 'Add a book',
    description:
      'Put a new title in the catalogue so copies of it can be issued. How many the school holds is what the shelf count runs on.',
    summary: [],
    fields: [
      {
        key: 'title',
        label: 'Title',
        required: true,
        wide: true,
        placeholder: 'Things Fall Apart',
      },
      {
        key: 'author',
        label: 'Author',
        required: true,
        wide: true,
        placeholder: 'Chinua Achebe',
      },
      {
        key: 'copies',
        label: 'Copies held',
        required: true,
        number: true,
        min: 1,
        placeholder: '40',
      },
      { key: 'isbn', label: 'ISBN', placeholder: '978-0435925' },
      {
        key: 'pubdate',
        label: 'Published',
        placeholder: '2011',
        hint: 'A year, or a full date where the school holds one.',
      },
      { key: 'section', label: 'Section', placeholder: 'Computer science' },
      { key: 'callno', label: 'Call number', placeholder: '45' },
      { key: 'department_id', label: 'Class', optionsFrom: 'classes' },
    ],
    cta: 'Add',
    footnote: 'The title can be issued the moment it is added.',
    done: () => 'Title added',
    run: async (values) => {
      const field = (key: string) =>
        String(values[key] ?? '').trim() || undefined;
      const title = field('title');
      await libraryService.addBook({
        title,
        author: field('author'),
        copies: Number(values.copies) || undefined,
        isbn: field('isbn'),
        pubdate: field('pubdate'),
        section: field('section'),
        callno: field('callno'),
        department_id: Number(values.department_id) || undefined,
      });
      // The shelf page and the lending counter both read the catalogue; a
      // title added in order to be issued should wait out neither.
      dropCatalogue();
      return { message: `${title ?? 'The title'} is in the catalogue.` };
    },
  };
}

/**
 * Changing a title already on the shelf, via `POST /admins/books/{id}`.
 *
 * There is no book record page to open the old edit form on, so the flow
 * carries its own picker and the fields work as corrections: only what is
 * typed changes, and an empty field keeps what is written. That rule is kept
 * here rather than trusted to the endpoint — whether it updates partially has
 * never been proved, so the record is fetched, what was typed is merged over
 * it, and the whole body is sent.
 *
 * Retiring a title from lending is this flow too: Availability set to
 * Unavailable takes it out of the issue picker without removing the book.
 *
 * Opened from a title's own record, the picker arrives already on it; from
 * the list's button it opens blank, and either way the pick can be changed.
 */
function editTitle(row?: Row): ActionDef {
  return {
    kicker: 'School · Library',
    title: 'Edit a title',
    description:
      'Pick the title, then fill only what changes — anything left empty keeps what is written. Setting it Unavailable retires it from lending without removing it.',
    summary: row ? [{ label: 'Editing', value: row.title }] : [],
    fields: [
      {
        key: 'book_id',
        label: 'Book',
        required: true,
        wide: true,
        optionsFrom: 'all-books',
        value: row?.id,
        hint: 'Every title the school holds, retired ones included.',
      },
      {
        key: 'title',
        label: 'Title',
        wide: true,
        placeholder: 'Keep as written',
      },
      {
        key: 'author',
        label: 'Author',
        wide: true,
        placeholder: 'Keep as written',
      },
      {
        key: 'copies',
        label: 'Copies held',
        number: true,
        min: 1,
        placeholder: 'Keep as written',
      },
      { key: 'isbn', label: 'ISBN', placeholder: 'Keep as written' },
      { key: 'pubdate', label: 'Published', placeholder: 'Keep as written' },
      { key: 'section', label: 'Section', placeholder: 'Keep as written' },
      { key: 'callno', label: 'Call number', placeholder: 'Keep as written' },
      { key: 'department_id', label: 'Class', optionsFrom: 'classes' },
      /*
       * **Availability is no longer asked.** It was a switch the office set —
       * `isavailable` spelled `"Available"` / `"Unavailable"` — and on
       * 2026-09-16 bronze began answering with a number instead: the count of
       * copies free to lend, `copies` minus what is out, which is the
       * library's own arithmetic and nobody's to type. Offering the words
       * would have written one into a numeric column.
       *
       * The value is still sent, unchanged, because this endpoint takes the
       * record whole rather than a diff — see `run` below. What is gone is the
       * question.
       */
    ],
    cta: 'Save the changes',
    footnote: 'Only what you filled in changes; the rest stands as written.',
    done: () => 'Title updated',
    run: async (values) => {
      const picked = String(values.book_id ?? '');
      const books = await libraryService.books();
      const book = books.find((one) => String(one.id) === picked);
      if (!book) throw new Error('That title could not be loaded.');

      const typed = (key: string) => String(values[key] ?? '').trim();
      await libraryService.updateBook(book.id, {
        title: typed('title') || book.title,
        author: typed('author') || book.author,
        copies: Number(values.copies) || book.copies,
        isbn: typed('isbn') || book.isbn || undefined,
        pubdate: typed('pubdate') || book.pubdate || undefined,
        section: typed('section') || book.section || undefined,
        callno: typed('callno') || book.callno || undefined,
        department_id:
          Number(values.department_id) || book.department_id || undefined,
        // Handed back exactly as it was read. The flow sends the record whole,
        // so leaving the key out could blank a column this form has no
        // business setting — and it is derived stock now, not a switch.
        isavailable: book.isavailable,
      });
      // The shelf page and both pickers read the catalogue; a rename or a
      // retirement should not wait out their caches.
      dropCatalogue();
      return {
        message: `${typed('title') || book.title} now reads as corrected.`,
      };
    },
  };
}

/** The loan's tiles, shared by every flow that runs against one. */
function loanSummary(row?: Row) {
  return [
    { label: 'Student', value: row?.student ?? DASH },
    { label: 'Book', value: row?.book ?? DASH },
    { label: 'Due back', value: row?.due ?? DASH },
  ];
}

/**
 * Taking an issued copy back, via `POST /loanedbooks/{loanId}/return`.
 *
 * Keyed on the loan, not the book — the register's record is the one thing
 * that says which copy and which student. Returning settles the book only: a
 * fine that accrued stays owing until the pay flow takes it, which is the
 * API's own split and is said out loud in the dialog rather than smoothed
 * over.
 */
function takeBack(row?: Row): ActionDef {
  /*
   * A late copy is not handed back until the fine on it has been taken. That
   * is the school's rule, and this is the one screen that can enforce it: the
   * child is at the counter, the book is in their hand, and after the return
   * goes through the loan is closed and the money is nobody's to chase.
   *
   * So the box is required on an overdue copy and optional on one that came
   * back on time — most do, and a figure demanded on every ordinary return
   * would have the desk typing 0 forty times a day until it stopped meaning
   * anything.
   */
  const late = row ? fineDue(row) : false

  return {
    kicker: 'School · Lending',
    title: `Return ${row?.book ?? 'book'}`,
    description: late
      ? 'This copy is late. The fee has to be taken before it goes back — enter what the student hands over, and the copy and the money are both settled from here.'
      : 'Mark the copy returned and put it back on the shelf. Anything owed on it can be taken here at the same time.',
    summary: [
      ...loanSummary(row),
      { label: 'Fine if returned today', value: row?.penalty_today ?? DASH },
    ],
    fields: [
      {
        key: 'status',
        label: 'Condition',
        required: true,
        wide: true,
        value: 'Good',
        hint: 'The state the book came back in — Good, Damaged, Lost — kept on the loan record.',
      },
      /*
       * The fine, taken in the same breath as the book. Required exactly when
       * the copy is late; see `late` above.
       */
      {
        key: 'amount',
        label: late ? 'Late fee collected' : 'Fine paid',
        money: true,
        wide: true,
        required: late,
        hint: late
          ? 'What the student is handing over for bringing it back late. The book cannot go back on the shelf until this is taken.'
          : 'What the student is handing over now. Leave it empty if nothing is owed — the book still goes back.',
      },
    ],
    cta: late ? 'Take the fee and return' : 'Return book',
    footnote: 'Nothing is taken and nothing is returned until you press this.',
    done: () => 'Book returned',
    confirm: (_total, values) => {
      const paying = parseNaira(String(values?.amount ?? ''));
      return {
        title: paying ? 'Take the fine and return this book?' : 'Return this book?',
        /*
         * The dialog says the order it actually happens in, and it says the
         * figure — a confirm that mentions a book and quietly also takes
         * ₦32,000 is the one kind of dialog this app must not have.
         *
         * The order is the school's: the copy goes back, which is what works
         * the fine out, and the money is taken against it straight after.
         */
        body: paying
          ? 'The copy goes back on the shelf first — that is what works the fine out — and the money is taken against it straight after. If the payment is refused the book is still back and the fine still stands, so it can be collected from the loan.'
          : 'The loan is closed and the copy goes back on the shelf, ready to be issued again. Nothing is collected — leave the amount empty only if nothing is owed.',
        subject: [row?.book ?? 'This title', row?.student, paying ? formatNaira(paying) : undefined]
          .filter(Boolean)
          .join(' · '),
        cta: paying ? 'Take it and return the book' : 'Return the book',
        cancel: 'Go back',
      };
    },
    run: async (values) => {
      if (!row) throw new Error('That loan could not be loaded.');
      /*
       * The book in the path, the pupil in the body — and the second is not
       * optional. A title the school holds two copies of is out to two
       * children, and `POST /books/{bookId}/return` cannot tell which
       * borrowing closed without being told whose it was; it refuses the lot
       * with a 409 rather than guess.
       *
       * A row that cannot name both is refused here rather than posted as a
       * path with a hole in it or a body naming nobody.
       */
      const asked = returnRequest(row, String(values.status ?? ''));
      if (!asked) {
        throw new Error('That loan does not say which title it is of, or who has it.');
      }

      const paying = parseNaira(String(values.amount ?? ''));
      /*
       * The same rule the field carries, checked again on the way out.
       *
       * The field's own `required` catches an empty box before the form will
       * submit; this catches a nought typed into it, which the money field is
       * perfectly happy with and which would otherwise sail through as "no
       * payment" and return a late book for free.
       */
      if (late && paying <= 0) {
        throw new Error('This copy is late. Enter the fee collected before returning it.');
      }

      /*
       * **The book first, then the money** — which is the reverse of what this
       * did, and the reverse is wrong against this API.
       *
       * The school works the fine out *as the copy comes in*: the return's own
       * answer carries a `fine` block with the days late, the rate, the amount
       * and what to pay it against. Until then there is nothing to pay, and
       * `POST /books/{id}/pay` looks for "who owes something on this book"
       * rather than for an open loan — so paying first answers 409 "There is
       * no fine to pay on that book for that pupil", on a return that was
       * perfectly good.
       *
       * What that costs is a return that lands and a payment that does not:
       * the copy is back on the shelf with the fine still owing. The school
       * designed for it — an unpaid fine is itself what stops the pupil
       * borrowing again — so the debt is not lost, it is simply not collected
       * yet, and the Collect the fine flow on the record takes it afterwards.
       */
      const answer = await libraryService.returnLoan(asked.bookId, asked.body);
      dropCatalogue();

      const collect = collectRequest(answer, row, paying);
      if (!collect) {
        return { message: `${row.book} is back on the shelf.` };
      }

      await libraryService.payForBook(collect.bookId, collect.body);
      // The money is real the moment it lands.
      dropMoneyReads(queryClient);
      return {
        message: `${row.book} is back on the shelf, and ${formatNaira(collect.body.amount ?? paying)} taken against the fine.`,
      };
    },
  };
}

/**
 * Collecting the fine, via `POST /loanedbooks/{loanId}/pay`.
 *
 * The money only — the endpoint does not mark the book returned, and neither
 * does this. The amount is optional on purpose: left empty, the API takes the
 * full fine as it stands at the server, which cannot go stale the way a figure
 * copied into the form could.
 */
function collectFine(row?: Row): ActionDef {
  return {
    kicker: 'School · Lending',
    title: 'Collect the fine',
    description:
      'Take the money owed on this loan. Paying does not return the book — that is its own step.',
    summary: [...loanSummary(row), { label: 'Fine', value: row?.fine ?? DASH }],
    fields: [
      {
        key: 'amount',
        label: 'Amount',
        money: true,
        wide: true,
        hint: 'Leave empty to take the full fine as it stands. A smaller figure is a part payment.',
      },
    ],
    cta: 'Collect fine',
    footnote: 'Nothing is collected until you press this.',
    done: () => 'Fine collected',
    confirm: (_total, values) => {
      const typed = parseNaira(String(values?.amount ?? ''));
      return {
        title: 'Collect this fine?',
        body: 'The payment is written against the loan. The book itself stays out until it is returned with its own button.',
        subject: [
          row?.student,
          row?.book,
          typed
            ? formatNaira(typed)
            : `the full fine (${row?.fine ?? 'as it stands'})`,
        ]
          .filter(Boolean)
          .join(' · '),
        cta: 'Collect the fine',
        cancel: 'Go back',
      };
    },
    run: async (values) => {
      if (!row) throw new Error('That loan could not be loaded.');
      const typed = parseNaira(String(values.amount ?? ''));
      /*
       * By the book and the pupil, not by the loan id.
       *
       * Two reasons, both the school's. A counter has the book in its hand and
       * the child in front of it; nobody there knows an internal loan id. And
       * the id on this row is only half of one — both lending tables number
       * from 1, so `loanedbooks/1/pay` and the row the desk is looking at need
       * not be the same loan at all.
       *
       * The amount is left out where the desk typed nothing, which tells the
       * school to take the fine as it stands. That figure cannot go stale the
       * way one copied onto this screen could.
       */
      const bookId = String(row.book_id ?? '').trim();
      const studentId = Number(row.student_id);
      if (!bookId || !Number.isFinite(studentId) || studentId <= 0) {
        throw new Error('That loan does not say which title it is of, or who has it.');
      }
      await libraryService.payForBook(bookId, {
        student_id: studentId,
        ...(typed ? { amount: typed } : {}),
      });
      dropCatalogue();
      dropMoneyReads(queryClient);
      return {
        message: typed
          ? `${formatNaira(typed)} collected.`
          : 'Fine collected in full.',
      };
    },
  };
}

/**
 * Correcting a loan record, via `POST /loanedbooks/{loanId}`.
 *
 * Only the due date and the condition are settable here — `returned` and
 * `paid` belong to their own endpoints — so those are the only fields offered.
 * No confirm: a correction commits no money and closes nothing.
 */
function correctLoan(row?: Row): ActionDef {
  const held = row?.due_raw ? new Date(row.due_raw) : undefined;
  return {
    kicker: 'School · Lending',
    title: 'Correct the record',
    description:
      'Move the due date or reword the condition. Returns and fines are not changed here — each has its own button.',
    summary: loanSummary(row),
    fields: [
      {
        key: 'due_date',
        label: 'Due back',
        required: true,
        date: true,
        value: held && !Number.isNaN(held.getTime()) ? held : dueDate(),
      },
      {
        key: 'condition',
        label: 'Condition',
        value: row?.condition && row.condition !== DASH ? row.condition : '',
        hint: 'Leave empty to keep what is written.',
      },
    ],
    cta: 'Save',
    footnote: 'Only the due date and condition change; the loan itself stands.',
    done: () => 'Loan corrected',
    run: async (values) => {
      if (!row) throw new Error('That loan could not be loaded.');
      const due = toApiDate(values.due_date as Date | undefined);
      const condition = String(values.condition ?? '').trim();
      /*
       * `toreturn` and `status` — the school's own names. This sent
       * `{due_date, condition}`, which the controller does not read, so every
       * correction ever made from this screen was accepted and discarded.
       *
       * Keyed on the loan, and the loan id is the desk table's alone: a row
       * from the retired assign-book screen has no record route here at all,
       * so it is refused rather than posted at somebody else's id.
       */
      const { source, id } = keyParts(row.id);
      if (source === 'borrowedbooks') {
        throw new Error(
          'This borrowing was made on the old assign-book screen, and the school keeps no record for it that can be corrected. Return it, and lend it again from here.',
        );
      }
      await libraryService.correctLoan(id, {
        toreturn: due,
        status: condition || undefined,
      });
      dropCatalogue();
      return { message: 'The record now reads as corrected.' };
    },
  };
}

/**
 * Which flow each collection's records enter, keyed by collection id. This is
 * the only place a flow is declared: a collection that is not listed here has
 * no flow and shows no button, so a filtered view of another collection's rows
 * cannot inherit one it has no page for.
 */
/**
 * Placing students into an arm.
 *
 * `POST /class-arms/{id}/students` judges each student separately and reports
 * what it would not take, so a partial move is a real outcome rather than a
 * failure — the page holds open with the reasons rather than navigating away.
 *
 * The picker offers only `unassigned_in_class`: students admitted into this
 * arm's class who are not yet in any arm. A student already placed elsewhere is
 * moved from the promote flow, not from here.
 */
async function placeStudents(row?: Row): Promise<ActionDef> {
  const armId = String(row?.id ?? '');
  const { unassigned_in_class } = await classArmsService.students(armId);

  return {
    kicker: 'Academics · Class arms',
    title: `Place students in ${row?.arm ?? 'this arm'}`,
    description:
      'Pick the students to put on this arm’s roll. Only students admitted into its class and not yet in any arm are listed.',
    summary: [
      { label: 'Arm', value: row?.arm ?? DASH },
      { label: 'Class', value: row?.klass ?? DASH },
      { label: 'On the roll', value: row?.roll ?? DASH },
    ],
    picker: {
      title: 'Waiting to be placed',
      items: unassigned_in_class.map((student) => ({
        key: String(student.id),
        label: studentName(student),
        meta: student.regno || 'No adm. no. yet',
        count: 1,
      })),
      note:
        unassigned_in_class.length === 0
          ? 'Every student admitted into this class is already in an arm.'
          : 'A student may only join an arm of their own class. Placing them here puts this arm on their register, their result sheet and their attendance.',
      requiredMessage: 'Pick at least one student to place.',
    },
    fields: [],
    cta: 'Place these students',
    footnote: 'Nothing moves until you press this.',
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? [];
      const { assigned, failed } = await classArmsService.assignStudents(
        armId,
        {
          student_ids: picked.map(Number),
        },
      );
      return {
        message: `${assigned.length} ${assigned.length === 1 ? 'student' : 'students'} placed in ${row?.arm ?? 'the arm'}`,
        failures: failed.map((one) => {
          const student = unassigned_in_class.find(
            (each) => each.id === one.student_id,
          );
          return `${student ? studentName(student) : `Student ${one.student_id}`} — ${one.reason}`;
        }),
      };
    },
    done: (picked) =>
      `${picked} ${picked === 1 ? 'student' : 'students'} placed in the arm`,
  };
}

/**
 * Choosing the classes a subject is taught to.
 *
 * `POST /subjects/{id}/classes` replaces the whole set, so the classes it is
 * already taught to arrive ticked and unticking one is how it is dropped. The
 * home class is kept by the API whether it is listed or not, which is what
 * stops a subject ending up taught to nobody — it is shown ticked and said so.
 */
async function teachTo(row?: Row): Promise<ActionDef> {
  const homeId = String(row?.department_id ?? '');
  const classes = await departmentsService
    .list({ limit: ALL_CLASSES })
    .then((page) => page.items);

  return {
    kicker: 'Academics · Subjects',
    title: `Teach ${row?.name ?? 'this subject'} to`,
    description:
      'Pick every class this subject is taught to. Unticking one drops it; the home class is always kept.',
    summary: [
      { label: 'Subject', value: row?.name ?? DASH },
      { label: 'Home class', value: row?.klass ?? DASH },
      { label: 'Taught to', value: row?.taught ?? DASH },
    ],
    picker: {
      title: 'Classes',
      items: classes.map((department) => ({
        key: String(department.id),
        label: department.name,
        // Most schools code a class differently from its name; this one does
        // not, and repeating "SSS I" beside "SSS I" says nothing.
        meta:
          String(department.id) === homeId
            ? 'Home class'
            : department.deptcode === department.name
              ? ''
              : department.deptcode,
        count: 0,
      })),
      preselected: row?.classIds
        ? row.classIds.split(',').filter(Boolean)
        : undefined,
      note: 'The home class stays whether it is ticked or not — a subject can never end up taught to nobody.',
      requiredMessage: 'Pick at least one class.',
    },
    fields: [],
    cta: 'Save these classes',
    footnote: 'Nothing changes until you press this.',
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? [];
      await subjectsService.setClasses(String(row?.id ?? ''), {
        classes: picked.map(Number),
      });
      return {
        message: `${row?.name ?? 'The subject'} is taught to ${picked.length} ${picked.length === 1 ? 'class' : 'classes'}`,
      };
    },
    done: (picked) =>
      `Taught to ${picked} ${picked === 1 ? 'class' : 'classes'}`,
  };
}

/**
 * What an administrator can open.
 *
 * There is no privileges catalogue endpoint — `/privileges` is not deployed —
 * so the list of eleven is read off the administrator being edited, which is
 * the only route that carries it. `POST /admins/{id}/privileges` replaces the
 * whole set, so what they already hold arrives ticked and unticking one is how
 * it is taken away.
 */
async function setPrivileges(row?: Row): Promise<ActionDef> {
  const id = parseStaffKey(String(row?.id ?? '')).id;
  const { admin, available } = await adminsService.privileges(id);
  const held = (admin.privileges ?? []).map((one) => String(one.id));

  return {
    kicker: 'Staff · Administrators',
    title: `What ${row?.name ?? 'this administrator'} can open`,
    description:
      'Tick every part of the portal this account may use. Unticking one takes it away at once — they stay signed in, but the section closes to them.',
    summary: [
      { label: 'Administrator', value: row?.name ?? DASH },
      { label: 'Account', value: row?.role ?? DASH },
      { label: 'Holds now', value: held.length ? String(held.length) : 'None' },
    ],
    picker: {
      title: 'Privileges',
      items: available.map((privilege) => ({
        key: String(privilege.id),
        label: privilege.name,
        meta: held.includes(String(privilege.id)) ? 'Held now' : '',
        count: 0,
      })),
      preselected: held,
      note: 'Ticking none leaves the account able to sign in and nothing else. It does not delete anything, and it can be put back here.',
    },
    fields: [],
    cta: 'Save these privileges',
    footnote: 'Nothing changes until you press this.',
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? [];
      await adminsService.setPrivileges(id, { privileges: picked.map(Number) });
      return {
        message: picked.length
          ? `${row?.name ?? 'The administrator'} holds ${picked.length} ${picked.length === 1 ? 'privilege' : 'privileges'}`
          : `${row?.name ?? 'The administrator'} holds no privileges`,
      };
    },
    done: (picked) =>
      picked ? `${picked} privileges saved` : 'Every privilege was taken away',
  };
}

/**
 * What a teacher is trusted with.
 *
 * `POST /teachers/{id}/subjects` replaces the whole set, so the subjects they
 * already carry arrive ticked and unticking one is how it is taken off them.
 * Every subject comes back with its class expanded, which is the only thing
 * telling two "MATHEMATICS" apart on a register that teaches it to five
 * classes.
 */
async function assignSubjects(row?: Row): Promise<ActionDef> {
  const id = parseStaffKey(String(row?.id ?? '')).id;
  const subjects = await subjectsService
    .list({ limit: ALL_SUBJECTS })
    .then((page) => page.items);
  const held = row?.subjectIds ? row.subjectIds.split(',').filter(Boolean) : [];

  return {
    kicker: 'Staff · Teachers',
    title: `What ${row?.name ?? 'this teacher'} teaches`,
    description:
      'Tick every subject this teacher carries. Unticking one takes it off them — it stays on the timetable for whoever else teaches it.',
    summary: [
      { label: 'Teacher', value: row?.name ?? DASH },
      { label: 'Class', value: row?.department ?? DASH },
      {
        label: 'Carries now',
        value: held.length ? String(held.length) : 'None',
      },
    ],
    picker: {
      title: 'Subjects',
      items: subjects.map((subject) => ({
        key: String(subject.id),
        // The class, because a school teaches the same subject to several and
        // the name alone would offer the reader five identical rows.
        meta: [
          subject.department,
          subject.is_active === false ? 'Inactive' : '',
        ]
          .filter(Boolean)
          .join(' · '),
        label: subject.name,
        count: 0,
      })),
      preselected: held,
      note: 'This replaces what they carry. Ticking none leaves them with no subject and no result sheet to enter, which is how a teacher is stood down without deleting them.',
    },
    fields: [],
    cta: 'Save these subjects',
    footnote: 'Nothing changes until you press this.',
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? [];
      await teachersService.assignSubjects(id, {
        subjects: picked.map(Number),
      });
      const who = row?.name ?? 'The teacher';
      return {
        message: picked.length
          ? `${who} carries ${picked.length} ${picked.length === 1 ? 'subject' : 'subjects'}`
          : `${who} carries no subjects`,
      };
    },
    done: (picked) =>
      picked
        ? `${picked} ${picked === 1 ? 'subject' : 'subjects'} saved`
        : 'Every subject was taken off',
  };
}

/**
 * Writing to staff.
 *
 * The endpoint takes logins rather than teaching records — `user_ids`, not
 * teacher ids — so the picker is keyed on the login behind each row. It is
 * opened from one teacher with them already ticked, and anyone else on the
 * register can be added to the same message.
 *
 * At least one is insisted on: the API is documented as mailing every member
 * of staff for an empty list, and a whole-school email is not something to
 * arrive at by unticking the last name on a picker.
 */
async function mailStaff(row?: Row): Promise<ActionDef> {
  const teachers = await teachersService
    .list({ limit: ALL_TEACHERS })
    .then((page) => page.items);

  return {
    kicker: 'Staff · Teachers',
    title: 'Message staffs',
    description: 'Write to one or more staffs',
    summary: [
      { label: 'On the register', value: String(teachers.length) },
      { label: 'Opened', value: row?.name ?? 'The register' },
    ],
    picker: {
      title: 'Who it goes to',
      items: teachers.map((teacher) => ({
        key: String(teacher.user_id),
        label: [teacher.firstname, teacher.middlename, teacher.lastname]
          .filter(Boolean)
          .join(' '),
        meta: teacher.user?.username ?? '',
        count: 1,
      })),
      preselected: row?.user_id ? [row.user_id] : undefined,
      note: 'Everyone ticked gets the same message. There is no draft and no undo — it is sent when you press the button.',
      requiredMessage: 'Pick at least one person to write to.',
    },
    fields: [
      {
        key: 'subject',
        label: 'Subject',
        required: true,
        wide: true,
        placeholder: 'Staff meeting, Friday 3pm',
      },
      {
        key: 'message',
        label: 'Message',
        required: true,
        wide: true,
        // Written rather than typed, the same as the teacher's own message
        // form beside it — `src/portals/teacher/features/messages`. Both post
        // to the same kind of endpoint and both send HTML.
        rich: true,
        placeholder: 'What you want them to know.',
      },
    ],
    tally: (values) => {
      const picked = (values.picks as string[] | undefined) ?? [];
      return [
        {
          label: 'Going to',
          value: `${picked.length} ${picked.length === 1 ? 'person' : 'people'}`,
        },
      ];
    },
    cta: 'Send this email',
    footnote: 'Sent the moment you press this.',
    confirm: (_total, values) => {
      const picked = (values?.picks as string[] | undefined) ?? [];
      return {
        title: 'Send this email?',
        body: 'It leaves the school straight away and cannot be recalled. Check who it is going to and what it says.',
        subject: `${picked.length} ${picked.length === 1 ? 'person' : 'people'} · ${String(values?.subject ?? '').trim() || 'No subject'}`,
        cta: 'Send it',
        cancel: 'Go back',
      };
    },
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? [];
      await teachersService.mail({
        user_ids: picked.map(Number),
        subject: String(values.subject ?? '').trim(),
        message: String(values.message ?? '').trim(),
      });
      return {
        message: `Email sent to ${picked.length} ${picked.length === 1 ? 'person' : 'people'}`,
      };
    },
    done: (picked) =>
      `Email sent to ${picked} ${picked === 1 ? 'person' : 'people'}`,
  };
}

/** Both of a teacher's flows, on the mixed register as on their own. */
const isTeacher = (record: Row) => parseStaffKey(record.id).kind === 'teacher';

const teacherFlows: AdminFlow[] = [
  {
    name: 'subjects',
    label: 'Assign subjects',
    when: isTeacher,
    build: assignSubjects,
  },
  { name: 'mail', label: 'Send email', when: isTeacher, build: mailStaff },
];

/**
 * What a batch is, for the two flows below: one subject, for one class, in one
 * term. The four ids that say which are carried in the row's own id, so a
 * batch that cannot be read back is refused rather than acted on — releasing
 * on a half-read key would sign off somebody else's marks.
 */
function batchOf(row?: Row) {
  const key = row && parseBatchId(row.id);
  if (!key) throw new Error('That batch could not be read.');
  return key;
}

/**
 * What the office is about to sign off, in the queue's own words. Only the
 * tiles the batch actually carries — releasing marks is the one screen in the
 * app where a dash would be read as "and something else I cannot see".
 */
function batchSummary(row?: Row) {
  return [
    { label: 'Class', value: row?.klass },
    { label: 'Term', value: row?.term },
    { label: 'Session', value: row?.session },
    { label: 'Students', value: row?.students },
  ].filter((tile): tile is { label: string; value: string } =>
    Boolean(tile.value && tile.value !== DASH),
  );
}

const batchSubject = (row?: Row) =>
  [row?.subject, row?.klass, row?.term]
    .filter((part) => part && part !== DASH)
    .join(' · ');

/**
 * Releasing a batch.
 *
 * Confirmed, because this is the moment marks reach families and nothing on
 * this screen takes it back — a released mark is withdrawn one at a time from
 * the results register.
 */
function releaseBatch(row?: Row): ActionDef {
  return {
    kicker: 'Academics · Result approvals',
    title: `Release ${row?.subject ?? 'this batch'}`,
    description:
      'Every mark in this batch goes in front of the students and their families. Releasing twice changes nothing, and a mark corrected afterwards comes back into the queue on its own.',
    summary: batchSummary(row),
    fields: [],
    cta: 'Release the batch',
    footnote:
      'Only the office may release a batch, not the teacher who entered it.',
    done: () => 'Batch released',
    confirm: () => ({
      title: 'Release these marks?',
      body: 'Students and their families see every mark in this batch, and the grade beside each one, as soon as this goes through. Taking one back afterwards is done a mark at a time from the results register.',
      subject: batchSubject(row),
      cta: 'Release the batch',
      cancel: 'Go back',
    }),
    run: async () => {
      await resultsService.approve(batchOf(row));
      return { message: 'Batch released' };
    },
  };
}

/**
 * Sending a batch back.
 *
 * The reason is required and is stored against every mark in the batch, which
 * is the only thing the teacher has to work from — "sent back" with nothing
 * written on it is a batch nobody knows how to fix.
 */
function sendBatchBack(row?: Row): ActionDef {
  return {
    kicker: 'Academics · Result approvals',
    title: `Send ${row?.subject ?? 'this batch'} back`,
    description:
      'The batch returns to the teacher who filed it, with your reason written against every mark in it. Nothing reaches a family in the meantime.',
    summary: batchSummary(row),
    fields: [
      {
        key: 'reason',
        label: 'What needs fixing',
        required: true,
        multiline: true,
        wide: true,
        placeholder: 'The second CA is missing for half the class.',
        hint: 'Stored against every mark in the batch. This is what the teacher sees.',
      },
    ],
    cta: 'Send it back',
    footnote:
      'The batch reappears here once the teacher has filed the corrections.',
    done: () => 'Batch sent back',
    run: async (values) => {
      await resultsService.reject({
        ...batchOf(row),
        reason: String(values.reason ?? '').trim(),
      });
      return { message: 'Batch sent back' };
    },
  };
}

export const adminFlows: Record<string, AdminFlow[]> = {
  fees: [{ name: 'allocate', label: 'Allocate to classes', build: allocate }],
  // Granting and taking away privileges is a super administrator's alone; the
  // API refuses everyone else. And a super administrator's own privileges are
  // not edited from here at all: the account is the school's way back in, and
  // the section that puts a privilege back is one of the ones being taken.
  'staff-admin': [
    {
      name: 'privileges',
      label: 'Set privileges',
      allowed: (record) =>
        superAdminSignedIn() && !isSuperAdminRole(record?.role),
      deniedBody: (record) =>
        isSuperAdminRole(record?.role)
          ? 'A super administrator holds every section of the portal, and that is not edited from here — taking one away could leave the school with no account able to put it back. Their role is what decides it, and the role is changed on the login.'
          : undefined,
      build: setPrivileges,
    },
  ],
  // The mixed register opens teaching records too, and a flow that cannot run
  // against an office record is not offered on one.
  staff: teacherFlows,
  'staff-teachers': teacherFlows,
  // Record-scoped, not `fromList`: a payment needs the invoice it settles,
  // and the queue's own search is how that invoice is found.
  collect: [
    { name: 'pay', label: 'Take a payment', when: payAction, build: payment },
  ],
  arms: [{ name: 'place', label: 'Place students', build: placeStudents }],
  subjects: [{ name: 'classes', label: 'Teach to classes', build: teachTo }],
  students: [{ name: 'move', label: 'Promote or transfer', build: promote }],
  applicants: [{ name: 'review', label: 'Review application', build: review }],
  // Two flows rather than one with a decision box: releasing is the common
  // answer and wants no form at all, and sending back is meaningless without
  // the reason. A batch is read on its own page before either is pressed.
  'result-queue': [
    { name: 'release', label: 'Release the batch', build: releaseBatch },
    { name: 'send-back', label: 'Send it back', build: sendBatchBack },
  ],
  // The shelf's own flows, on the Library page's first tab. Adding is
  // list-level only; editing is offered from the list and from a title's
  // record alike, and opened on a record it arrives with that title picked.
  books: [
    {
      name: 'add',
      label: 'Add a book',
      fromList: true,
      when: () => false,
      build: addTitle,
    },
    {
      name: 'edit-title',
      label: 'Edit a title',
      fromList: true,
      build: editTitle,
    },
  ],
  library: [
    {
      name: 'lend',
      label: 'Issue a book',
      // The list's primary button, not a record's: `when` is only consulted on
      // records, so refusing every one of them keeps "issue" off a loan that
      // already exists while the register itself still offers it.
      fromList: true,
      when: () => false,
      build: lend,
    },
    {
      name: 'return',
      label: 'Return this book',
      when: (record) => record.standing !== 'Returned',
      build: takeBack,
    },
    {
      name: 'pay',
      label: 'Collect the fine',
      /*
       * Owing, and recordable. The retired table has no penalty column and no
       * paid column, so a fine against one of its rows is what the school
       * *would* charge rather than a debt it has booked — there is nowhere to
       * mark it paid, and the school's own instruction is to offer no button.
       * Drawing one would take money the school then cannot show as received.
       */
      when: (record) => record.paid === 'Owing' && record.fine_tracked !== 'No',
      build: collectFine,
    },
    { name: 'correct', label: 'Correct the record', build: correctLoan },
  ],
};
