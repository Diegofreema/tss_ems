import { loadRecord as loadOne } from '@/features/collections/resolve'
import { studentCollections } from './index'

export const loadRecord = (id: string, recordId: string) =>
  loadOne(studentCollections, id, recordId)
