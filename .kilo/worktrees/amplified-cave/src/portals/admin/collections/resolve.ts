import {
  loadCollection as load,
  loadRecord as loadOne,
  loadRecordForEdit as loadOneForEdit,
} from '@/features/collections/resolve'
import { adminCollections } from './index'
import { adminCollectionRoutes } from './routes'

export const loadCollection = (id: string) => load(adminCollections, id)

export const loadRecord = (id: string, recordId: string) =>
  loadOne(adminCollections, id, recordId)

export const loadRecordForEdit = (id: string, recordId: string) =>
  loadOneForEdit(adminCollections, id, recordId, adminCollectionRoutes.record)
