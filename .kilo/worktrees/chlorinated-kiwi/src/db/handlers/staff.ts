import { adminsService } from '@/api/admins/service'
import type { CreateAdminBody, UpdateAdminRecordBody } from '@/api/admins/types'
import { teachersService } from '@/api/teachers/service'
import type { CreateStaffBody, UpdateStaffBody } from '@/api/teachers/types'
import type { Id } from '@/api/types'
import { usersService } from '@/api/users/service'
import { refreshAccount } from '@/features/auth/session'
import { queryClient } from '@/lib/query-client'
import type { UpdateProfileBody } from '@/api/users/types'
import { SET, WRITE } from '../ids'
import { idUnder } from '../new-id'
import { registerHandler } from '../registry'

/**
 * The two registers behind the staff page: the teaching records and the office
 * ones. They are two endpoints, so they are two handlers each — the page knows
 * which of them a row belongs to from the row's own key.
 *
 * Creating either is **not** idempotent; the school issues the id. Updating and
 * deleting are, and both deletes are permanent: the API refuses the first
 * administrator and your own account outright, which the drain treats as
 * terminal and puts in front of a person.
 */

registerHandler<CreateStaffBody>(WRITE.createTeacher, {
  send: (body) => teachersService.create(body),
  idempotent: false,
  newId: idUnder('teacher'),
  collectionId: SET.refTeachers,
})

registerHandler<{ id: Id; body: UpdateStaffBody }>(WRITE.updateTeacher, {
  send: ({ id, body }) => teachersService.update(id, body),
  idempotent: true,
  collectionId: SET.refTeachers,
})

registerHandler<Id>(WRITE.removeTeacher, {
  send: (id) => teachersService.remove(id),
  idempotent: true,
  collectionId: SET.refTeachers,
})

registerHandler<CreateAdminBody>(WRITE.createAdmin, {
  send: (body) => adminsService.create(body),
  idempotent: false,
  newId: idUnder('admin'),
  collectionId: SET.refAdmins,
})

registerHandler<{ id: Id; body: UpdateAdminRecordBody }>(WRITE.updateAdmin, {
  send: ({ id, body }) => adminsService.update(id, body),
  idempotent: true,
  collectionId: SET.refAdmins,
})

registerHandler<Id>(WRITE.removeAdmin, {
  send: (id) => adminsService.remove(id),
  idempotent: true,
  collectionId: SET.refAdmins,
})

/**
 * Whether somebody can sign in at all.
 *
 * A different question from whether their office record is live, and the one
 * the register's button asks. Idempotent: the op says which of the two states
 * the login should end in. They keep the record, the privileges and everything
 * they have already done either way.
 */
registerHandler<{ id: Id; status: 'Enabled' | 'Disabled' }>(WRITE.setLogin, {
  send: ({ id, status }) => usersService.setStatus({ id, status }),
  idempotent: true,
  collectionId: SET.refAdmins,
})

/**
 * The signed-in administrator's own record — `PATCH /users/profile` writes to
 * the same Admins row the register lists. Idempotent: the same fields over
 * the caller's own record.
 */
registerHandler<UpdateProfileBody>(WRITE.updateAdminProfile, {
  send: async (body) => {
    const done = await usersService.updateProfile(body)
    // The sidebar name and the greeting come off the signed-in account, which
    // is this same record read through a different endpoint — re-read once
    // the write has actually landed, never earlier. Guarded by `onLine`
    // because `me` runs under the app's default network mode, and a paused
    // read here would strand this op in `sending`.
    if (navigator.onLine) await refreshAccount(queryClient).catch(() => undefined)
    return done
  },
  idempotent: true,
  collectionId: SET.refAdmins,
})
