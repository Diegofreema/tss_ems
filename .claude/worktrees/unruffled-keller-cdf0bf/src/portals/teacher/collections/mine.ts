import { teachingKeys } from '@/api/teaching/keys'
import { teachingService } from '@/api/teaching/service'
import { queryClient } from '@/lib/query-client'

/**
 * The lists behind the teacher's pages, each asked for once.
 *
 * A list, the tiles above it and the record page all want the same answer on
 * the same render, so it is asked for through the cache: react-query collapses
 * the concurrent calls into one request. Nothing is held between renders.
 */

/**
 * How much of the roll and the mark sheet is asked for at once.
 *
 * ponytail: both endpoints paginate and both are read whole here — a teacher's
 * roll is the pupils in their own arms and the marks are their own subjects' —
 * so this is one page in every school this runs in. A teacher with more than
 * this many pupils wants a search parameter on the endpoint, which it does not
 * have today, rather than a longer limit.
 */
export const ALL = 500

export const mySubjects = () =>
  queryClient.ensureQueryData({
    queryKey: teachingKeys.subjects(),
    queryFn: () => teachingService.subjects(),
  })

export const myRoll = () =>
  queryClient.ensureQueryData({
    queryKey: teachingKeys.students({ limit: ALL }),
    queryFn: () => teachingService.students({ limit: ALL }),
  })

export const myMarks = () =>
  queryClient.ensureQueryData({
    queryKey: teachingKeys.results({ limit: ALL }),
    queryFn: () => teachingService.results({ limit: ALL }),
  })

export const myTopics = () =>
  queryClient.ensureQueryData({
    queryKey: teachingKeys.topics(),
    queryFn: () => teachingService.topics(),
  })

export const myEClasses = () =>
  queryClient.ensureQueryData({
    queryKey: teachingKeys.eclasses(),
    queryFn: () => teachingService.eclasses(),
  })

export const myBatches = () =>
  queryClient.ensureQueryData({
    queryKey: teachingKeys.uploads(),
    queryFn: () => teachingService.uploadBatches(),
  })
