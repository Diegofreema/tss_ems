import type { Option } from '@/features/collections/options'

/**
 * Every word on the landing page.
 *
 * The copy is the page's substance and it is fixed — there is no endpoint
 * behind a marketing site — so it sits here rather than inside the components
 * that draw it, and each section reads the one list it renders.
 */

/** The four rows beside the headline. */
export const HERO_FACTS = [
  { name: 'No more result week', label: 'Marks entered once become the report sheet.' },
  { name: 'Fees that add up', label: 'Installments, balances and receipts on one screen.' },
  {
    name: 'AI does the paperwork',
    label: 'Comments, summaries and early warnings, drafted for approval.',
  },
  { name: 'Works when the light goes', label: 'Registers and marks keep going offline.' },
] as const

/**
 * The strip under the hero. Ten items; the strip draws them twice so the loop
 * has no seam, which is the component's business rather than the copy's.
 */
export const MARQUEE = [
  'Enrolment',
  'Fee allocation',
  'Payments',
  'Attendance',
  'Batch scoring',
  'Result sheets',
  'Promotion',
  'Library lending',
  'E-class',
  'Notifications',
] as const

/** 01 — where the data already is. */
export const FRICTIONS = [
  { head: 'Attendance', body: 'Marked in a book, counted by hand at the end of term.' },
  { head: 'Fees', body: 'A ledger the office trusts and nobody else can read.' },
  { head: 'Scores', body: 'Collected from teachers late, retyped into result sheets.' },
  { head: 'Parents', body: 'Told what happened, weeks after it happened.' },
] as const

/** 02 — a problem and the answer to it, on one row each. */
export const SOLUTIONS = [
  {
    num: '01',
    problem: 'Attendance nobody can total',
    pain: 'A hardback register per class, counted by hand in the last week of term — and only then does anyone notice a child has missed a month.',
    fix: 'Teachers mark the register on the class list in front of them. Daily marks roll into term figures the office and the parent can both see the same day.',
    tags: ['Per-class registers', 'Term roll-up', 'Parent visibility'],
  },
  {
    num: '02',
    problem: 'Fees the office guards alone',
    pain: 'One ledger, one person who understands it, and a queue of parents asking what is still owing.',
    fix: 'Allocate a term’s fees to a whole class or a single student, take payment against the balance, and issue the receipt from the same screen.',
    tags: ['Class allocation', 'Receipts', 'Live balances'],
  },
  {
    num: '03',
    problem: 'Scores retyped into reports',
    pain: 'Marks live in teachers’ notebooks until reports are due, then get retyped — which is where the errors come from.',
    fix: 'Scores are entered in batch per subject, reviewed, then submitted for approval. Result sheets compile from what is already recorded.',
    tags: ['Batch entry', 'Review and approve', 'No re-entry'],
  },
  {
    num: '04',
    problem: 'Parents told late',
    pain: 'Progress reaches the home weeks after the fact, usually on paper, usually after it could have helped.',
    fix: 'Parents sign in to their own children: attendance, results as they publish, balance outstanding, receipts to download.',
    tags: ['Own children only', 'Published results', 'Downloadable receipts'],
  },
] as const

/** 03 — one term, in the order it happens. */
export const STEPS = [
  {
    num: '01',
    title: 'Admission',
    body: 'An applicant becomes an enrolled student in one form. Class, session and guardian are set once.',
    who: 'Admin',
  },
  {
    num: '02',
    title: 'Fees',
    body: 'Allocate the term’s fees to a class or a single student, then take payment against the balance.',
    who: 'Bursary',
  },
  {
    num: '03',
    title: 'Attendance',
    body: 'Registers are marked per class, per day, and roll up to a term figure nobody has to total.',
    who: 'Teacher',
  },
  {
    num: '04',
    title: 'Assessment',
    body: 'Tests and exams are scored in batch, reviewed, and submitted for approval.',
    who: 'Teacher',
  },
  {
    num: '05',
    title: 'Reports',
    body: 'Result sheets compile from the scores already recorded. Parents see them the moment they publish.',
    who: 'Admin · Parent',
  },
  {
    num: '06',
    title: 'Promotion',
    body: 'End of session, the class moves up together and the record follows the student.',
    who: 'Admin',
  },
] as const

/** 04 — the feature set, each named by the problem it answers. */
export const FEATURES = [
  {
    name: 'Fees and part-payments',
    body: 'Allocate a term’s fees to a class or one student, take payment in installments, and issue the receipt on the spot.',
    solves: 'Chasing balances',
  },
  {
    name: 'Result computation',
    body: 'Tests and exams are scored in batch, totals and positions compute themselves, and an admin approves before anything publishes.',
    solves: 'Report-sheet season',
  },
  {
    name: 'Registers that work offline',
    body: 'Teachers mark attendance on the device whether the network is up or not. It syncs when the line returns.',
    solves: 'No light, no network',
  },
  {
    name: 'Parent portal per child',
    body: 'Parents sign in to their own children only: attendance, published results, balance outstanding, receipts to download.',
    solves: 'Weekly phone calls',
  },
  {
    name: 'Privileges per staff member',
    body: 'Fee collection, result approval, enrolment — each granted to a person, not handed out with a job title.',
    solves: 'Who changed this?',
  },
  {
    name: 'Library lending',
    body: 'Issue and return books against the student record, with what is overdue and with whom visible at a glance.',
    solves: 'Missing books',
  },
  {
    name: 'E-class and materials',
    body: 'Teachers post notes, past questions and assignments where students can find them without a WhatsApp group.',
    solves: 'Scattered materials',
  },
  {
    name: 'Notifications',
    body: 'Results published, payment received, a child marked absent — the people who need to know are told the same day.',
    solves: 'Finding out late',
  },
] as const

/** 05 — what the assistant drafts, per role. */
export const AI_USES = [
  {
    role: 'Teachers',
    name: 'Report comments, drafted from the marks',
    body: 'At the end of term the assistant reads each student’s scores, attendance and trend, and drafts the comment in your voice. You edit, then submit.',
    instead: 'Forty comments written by hand on a Sunday night.',
  },
  {
    role: 'Admins',
    name: 'Early warning on fees and dropout risk',
    body: 'The assistant flags who is drifting behind on part-payments and which students’ attendance is falling before it becomes a withdrawal, with a suggested list to call.',
    instead: 'Finding out at the end of term, when the money and the child are gone.',
  },
  {
    role: 'Parents',
    name: 'The report explained in plain words',
    body: 'Ask what a score means, where your child slipped, and what to do about it. The answer is drawn from that child’s own record, in English or pidgin.',
    instead: 'A sheet of numbers and a guess.',
  },
  {
    role: 'Students',
    name: 'A study plan from your own weak topics',
    body: 'The assistant reads your test history, names the topics costing you marks, and sets practice questions from the material your teacher already posted.',
    instead: 'Revising everything and hoping.',
  },
] as const

/**
 * 06 — illustrative placeholders, and the handoff says so. They are attributed
 * to a desk rather than a person for that reason; replace them with real,
 * attributable quotes before launch or drop the section.
 */
export const VOICES = [
  {
    text: 'The register stopped being a week of arithmetic at the end of term.',
    who: 'Vice Principal, Academics',
    where: 'Secondary school, 640 students',
  },
  {
    text: 'Parents stopped calling to ask their balance. They can see it.',
    who: 'Bursar',
    where: 'Group of two campuses',
  },
  {
    text: 'I enter my marks once, and the result sheet is already right.',
    who: 'Subject teacher, JSS3',
    where: 'Day school, 380 students',
  },
] as const

/** 07 — what a school is buying besides the software. */
export const TRUST = [
  {
    head: 'Your data comes with you',
    body: 'We import existing class lists, fee history and staff records before go-live, so the first term starts full, not empty.',
  },
  {
    head: 'Works when the network does not',
    body: 'Attendance and score entry continue offline on the device and sync when the connection returns.',
  },
  {
    head: 'Permissions per person',
    body: 'Privileges are granted per staff member — result approval, fee collection, enrolment — not handed out with a job title.',
  },
  {
    head: 'Training for both rooms',
    body: 'One session for the office and bursary, one for teachers. Recorded, so new staff can catch up.',
  },
  {
    head: 'Support through the first reports',
    body: 'A named contact stays with the school until the first set of result sheets is published and signed off.',
  },
] as const

/** 08 — the six asked on every call. */
export const FAQS = [
  {
    question: 'Do we have to stop using our current records?',
    answer:
      'No. We import the register, fee history and class lists you already keep, and you run both for a term if you want to.',
  },
  {
    question: 'What happens when the network drops?',
    answer:
      'Registers and score entry keep working on the device and sync when the connection returns. Nothing is lost mid-register.',
  },
  {
    question: 'Can parents see other children’s records?',
    answer:
      'No. A parent account is bound to its own children, and every screen is filtered by that permission before it renders.',
  },
  {
    question: 'Who can approve a result?',
    answer:
      'Teachers submit; an admin with the result-approval privilege publishes. The privilege is set per staff member, not per role.',
  },
  {
    question: 'How long does setup take?',
    answer:
      'About a week for a single school: import, class structure, staff accounts, then a training session for the office and the staff room.',
  },
  {
    question: 'What does it cost to add a parent account?',
    answer:
      'Nothing. Pricing counts enrolled students only; parent and staff accounts are included.',
  },
] as const

/** The one question the walkthrough form asks that is not free text. */
export const SIZE_OPTIONS: readonly Option[] = [
  'Under 300 students',
  '300 – 800 students',
  '800 – 2,000 students',
  'Over 2,000 students',
  'A group of schools',
].map((size) => ({ value: size, label: size }))
