import {
  loadCollection as load,
  loadRecord as loadOne,
  loadRecordForEdit as loadOneForEdit,
} from '@/features/collections/resolve'
import { teacherCollections } from './index'
import { teacherCollectionRoutes } from './routes'

export const loadCollection = (id: string) => load(teacherCollections, id)

export const loadRecord = (id: string, recordId: string) =>
  loadOne(teacherCollections, id, recordId)

export const loadRecordForEdit = (id: string, recordId: string) =>
  loadOneForEdit(teacherCollections, id, recordId, teacherCollectionRoutes.record)
