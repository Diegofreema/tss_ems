import { useQuery } from '@tanstack/react-query'
import { mySchoolingKeys } from './keys'
import { mySchoolingService } from './service'

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

export function useMyMaterials() {
  return useQuery({
    queryKey: mySchoolingKeys.materials(),
    queryFn: () => mySchoolingService.materials(),
  })
}
