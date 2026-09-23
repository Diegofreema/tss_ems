import { Search } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import type { Contact } from '@/api/conversations/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Option } from '@/features/collections/options';
import { cn } from '@/lib/utils';
import { hasText } from '@/features/collections/rich-text';
import { contactOptions, matchesContact } from '../contacts';
import { queueStart } from '../send';

/**
 * Split out for the same reason the assignment brief splits it: the editor is
 * a large dependency, and a portal whose reader never writes a message should
 * not carry it. The dialog is only mounted once somebody opens it.
 */
const RichTextEditor = lazy(() =>
  import('@/components/editor/rich-text-editor').then((module) => ({
    default: module.RichTextEditor,
  })),
);

/**
 * Starting a conversation.
 *
 * Who may be written to is the school's answer, not a list this app assembled
 * — a parent is offered the staff who actually teach their children plus the
 * office, a teacher the parents of the students they teach. So the picker is a
 * list to search rather than a form field to fill in, and writing to somebody
 * off it is not possible from here at all: the endpoint refuses it, and
 * offering it would be offering something that cannot work.
 *
 * The whole thing is fillable with no connection, because the contacts are a
 * set on the device. Pressing send accepts the message here and queues it.
 */
export function ComposeDialog({
  open,
  onOpenChange,
  contacts,
  contactsFailed,
  childOptions,
  childLabel = 'About which child',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  /** Never synced on this device, so there is nobody to offer. */
  contactsFailed: boolean;
  /**
   * The guardian's own children, where the portal has them. Named
   * `childOptions` rather than `children` so it cannot be mistaken for what
   * React puts between the tags.
   */
  childOptions?: Option[];
  childLabel?: string;
}) {
  const [term, setTerm] = useState('');
  const [to, setTo] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const options = useMemo(() => contactOptions(contacts), [contacts]);
  const shown = useMemo(
    () => options.filter((option) => matchesContact(option, term)),
    [options, term],
  );

  const reset = () => {
    setTerm('');
    setTo(null);
    setSubject('');
    setBody('');
    setStudentId('');
    setShowErrors(false);
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // `hasText` rather than a trim: an emptied editor still hands back `<p></p>`,
  // which is a non-empty string and would pass every check made on one.
  const ready = to !== null && subject.trim().length > 0 && hasText(body);

  const send = async () => {
    if (!ready) {
      setShowErrors(true);
      return;
    }
    const outcome = await queueStart({
      to: to!,
      subject: subject.trim(),
      body: body.trim(),
      // Left out entirely rather than sent empty: it records which child the
      // thread is about, and "no child" is not a child.
      ...(studentId ? { student_id: Number(studentId) } : {}),
    });
    // The dialog closes on a message that is sent or safely held, and stays
    // open on one the school refused — with the recipient, the subject and
    // everything written still in it.
    if (outcome === 'refused') return;
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      {/* `sm:` because the dialog's own default is `sm:max-w-sm`, and an
          unprefixed width loses to it at every size that matters. Widened
          when the body became an editor: the toolbar is nineteen buttons, and
          in the old width it wrapped onto three rows and ate the writing
          area it sits above. */}
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>
            Start a new conversation or continue an existing one.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4.5 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div className="flex min-h-72 flex-col rounded-lg border border-divider">
            <div className="relative border-b border-divider p-2">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2}
              />
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search by name or role"
                aria-label="Search the people you may write to"
                className="pl-8"
              />
            </div>

            <div className="max-h-64 flex-1 overflow-y-auto">
              {contactsFailed ? (
                <p className="px-3.5 py-6 text-xs leading-relaxed text-muted-foreground">
                  This device has never been told who you may write to, and
                  cannot ask now. Open this page once with a connection.
                </p>
              ) : shown.length === 0 ? (
                <p className="px-3.5 py-6 text-xs leading-relaxed text-muted-foreground">
                  {options.length === 0
                    ? 'The school has given this account nobody to write to.'
                    : `Nobody matches “${term}”.`}
                </p>
              ) : (
                <ul>
                  {shown.map((option) => (
                    <li key={option.userId}>
                      <button
                        type="button"
                        onClick={() => setTo(option.userId)}
                        aria-pressed={option.userId === to}
                        className={cn(
                          'block w-full cursor-pointer border-b border-divider px-3.5 py-2.5 text-left transition-colors last:border-b-0',
                          option.userId === to
                            ? 'bg-brand/10'
                            : 'hover:bg-foreground/5',
                        )}
                      >
                        {/*
                          The name alone on the first line, and the login id on
                          the second where two people share a name — appended to
                          the name it was the first thing the truncation ate,
                          which is exactly backwards for the one label whose job
                          is to tell two rows apart.
                        */}
                        <div className="truncate text-sm font-medium">
                          {option.name}
                        </div>
                        <div className="truncate text-2xs text-muted-foreground">
                          {option.why ?? option.role}
                          {option.ambiguous && ` · login ${option.userId}`}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div>
              <Label
                htmlFor="compose-subject"
                className="mb-1.25 block text-xs font-normal text-foreground/70"
              >
                Subject
              </Label>
              <Input
                id="compose-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="One line — what this is about"
                aria-invalid={showErrors && !subject.trim()}
              />
            </div>

            {childOptions && childOptions.length > 0 && (
              <div>
                <Label
                  htmlFor="compose-child"
                  className="mb-1.25 block text-xs font-normal text-foreground/70"
                >
                  {childLabel} <span className="opacity-70">(optional)</span>
                </Label>
                <select
                  id="compose-child"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Not about one child</option>
                  {childOptions.map((child) => (
                    <option key={child.value} value={child.value}>
                      {child.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-1 flex-col">
              <Label
                htmlFor="compose-body"
                className="mb-1.25 block text-xs font-normal text-foreground/70"
              >
                Message
              </Label>
              <Suspense
                fallback={
                  <div className="h-40 animate-ems-fade rounded-lg border border-input" />
                }
              >
                <RichTextEditor
                  id="compose-body"
                  value={body}
                  onChange={(html) => setBody(hasText(html) ? html : '')}
                  placeholder="Write your message"
                  invalid={showErrors && !hasText(body)}
                  // The same four controls the reply box has. Starting a
                  // conversation and answering one are the same act of
                  // writing, and two different toolbars inside one feature is
                  // the sort of difference nobody can give a reason for.
                  brief
                />
              </Suspense>
            </div>
          </div>
        </div>

        {showErrors && !ready && (
          <p className="text-xs text-danger-ink">
            Choose who this is for, and give it a subject and a message.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={send}>Send message</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
