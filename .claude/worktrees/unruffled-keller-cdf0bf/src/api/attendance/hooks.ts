import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saveBlob } from '@/lib/download'
import { attendanceKeys, registerKeys } from './keys'
import { attendanceService, registerService } from './service'
import type {
  AttendanceExportParams,
  AttendanceReportParams,
  CoverageParams,
  MyAttendanceParams,
  RegisterParams,
  TakeRegisterBody,
} from './types'

export function useAttendanceDashboard(date?: string) {
  return useQuery({
    queryKey: attendanceKeys.dashboard(date),
    queryFn: () => attendanceService.dashboard(date),
  })
}

export function useAttendanceReport(params: AttendanceReportParams = {}) {
  return useQuery({
    queryKey: attendanceKeys.report(params),
    queryFn: () => attendanceService.report(params),
  })
}

export function useAttendanceDepartments() {
  return useQuery({
    queryKey: attendanceKeys.departments(),
    queryFn: () => attendanceService.departments(),
    staleTime: Infinity,
  })
}

export function useAttendanceClassArms(departmentId?: number) {
  return useQuery({
    queryKey: attendanceKeys.classArms(departmentId),
    queryFn: () => attendanceService.classArms(departmentId),
    staleTime: Infinity,
  })
}

/**
 * A download, not a cache entry — hence a mutation. The file is fetched with
 * the bearer token and saved from memory, because the endpoint cannot be
 * reached with a plain link.
 */
export function useExportAttendanceCsv(filename: string) {
  return useMutation({
    mutationFn: (params: AttendanceExportParams = {}) => attendanceService.exportCsv(params),
    meta: { success: `${filename} downloaded` },
    onSuccess: (blob) => saveBlob(blob, filename),
  })
}

/* ----------------------------- the register ----------------------------- */

/**
 * The arms this teacher takes the roll for.
 *
 * `retry: false` because the interesting answer is the 404: it means this
 * teacher is nobody's class teacher, which the page says out loud rather than
 * retrying three times on the way to saying nothing.
 */
export function useMyRegisterClasses() {
  return useQuery({
    queryKey: registerKeys.myClasses(),
    queryFn: () => registerService.myClasses(),
    staleTime: Infinity,
    retry: false,
  })
}

/** The school's own words for a mark. They do not change during a sitting. */
export function useRegisterStatuses() {
  return useQuery({
    queryKey: registerKeys.statuses(),
    queryFn: () => registerService.statuses(),
    staleTime: Infinity,
  })
}

export function useRegister(params: RegisterParams | null) {
  return useQuery({
    queryKey: registerKeys.day(params ?? { class_arm_id: 0 }),
    queryFn: () => registerService.register(params as RegisterParams),
    enabled: Boolean(params?.class_arm_id),
  })
}

export function useCoverage(params: CoverageParams | null) {
  return useQuery({
    queryKey: registerKeys.coverage(params ?? { class_arm_id: 0 }),
    queryFn: () => registerService.coverage(params as CoverageParams),
    enabled: Boolean(params?.class_arm_id),
  })
}

/**
 * One save, and everything that counts attendance is stale — the day itself,
 * the coverage strip beside it, and the office's report on the same marks.
 */
export function useTakeRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: TakeRegisterBody) => registerService.take(body),
    meta: { success: 'Register saved' },
    onSettled: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
  })
}

/** The signed-in pupil's own record. */
export function useMyAttendance(params: MyAttendanceParams = {}) {
  return useQuery({
    queryKey: registerKeys.mine(params),
    queryFn: () => registerService.mine(params),
  })
}
