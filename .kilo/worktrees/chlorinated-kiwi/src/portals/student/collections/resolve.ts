import {
  loadCollection as load,
  loadRecord as loadOne,
} from '@/features/collections/resolve'
import { studentCollections } from './index'

export const loadCollection = (id: string) => load(studentCollections, id)

export const loadRecord = (id: string, recordId: string) =>
  loadOne(studentCollections, id, recordId)
