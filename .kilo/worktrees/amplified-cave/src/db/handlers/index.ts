/**
 * Every write this app knows how to send from the queue.
 *
 * Imported for its side effects at boot, before the drain starts, and
 * deliberately not by the portal that uses it: a register marked on Tuesday
 * afternoon is sent by whatever code is running on Wednesday morning, and if
 * the handler were registered by the teacher's own bundle then a drain that ran
 * before that bundle loaded would find the op naming something this build
 * "no longer knows how to send" and put a good register in front of a person to
 * puzzle over.
 *
 * These import their services and nothing else. A handler must not reach for a
 * collection: the collections are per portal and building them all here would
 * put every portal's sets in front of every visitor, on the first load, on a
 * connection this app exists to cope without. The set to refetch is named by
 * its id from `../ids`.
 */
import './academics'
import './attendance'
import './calendar'
import './conversations'
import './finance'
import './notices'
import './parents'
import './set-assignments'
import './staff'
import './students'
import './teaching'
