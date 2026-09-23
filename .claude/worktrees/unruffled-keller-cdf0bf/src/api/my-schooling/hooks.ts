import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mySchoolingKeys } from './keys'
import { mySchoolingService } from './service'
import type { UpdateMyRecordBody } from './types'

export function useMyStudentRecord() {
  return useQuery({
    queryKey: mySchoolingKeys.record(),
    queryFn: () => mySchoolingService.record(),
  })
}

export function useUpdateMyStudentRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateMyRecordBody) => mySchoolingService.updateRecord(body),
    meta: { success: 'Your details were saved' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mySchoolingKeys.record() }),
  })
}

export function useMyStudentDashboard() {
  return useQuery({
    queryKey: mySchoolingKeys.dashboard(),
    queryFn: () => mySchoolingService.dashboard(),
  })
}

export function useMyCourses() {
  return useQuery({
    queryKey: mySchoolingKeys.courses(),
    queryFn: () => mySchoolingService.courses(),
  })
}

export function useMyStudentInvoices() {
  return useQuery({
    queryKey: mySchoolingKeys.invoices(),
    queryFn: () => mySchoolingService.invoices(),
  })
}

export function useMyMaterials() {
  return useQuery({
    queryKey: mySchoolingKeys.materials(),
    queryFn: () => mySchoolingService.materials(),
  })
}
