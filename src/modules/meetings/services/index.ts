import axios from 'axios'
import { api } from '@/app/plugins/axios'
import type { UUID } from '@/shared/types'
import type { JoinInfo, Meeting, MeetingInput, MeetingRecording } from '../types'
import { meetingProblem, type MeetingErrorCode } from '../utils'

/** Erro com o `code` do backend, para a tela decidir o que mostrar. */
export class MeetingRequestError extends Error {
  readonly code: MeetingErrorCode | null
  readonly status: number

  constructor(message: string, code: MeetingErrorCode | null, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function call<T>(request: () => Promise<{ data: T }>, fallback: string): Promise<T> {
  try {
    return (await request()).data
  } catch (error) {
    const response = axios.isAxiosError(error) ? error.response : undefined
    const problem = meetingProblem(response?.data, fallback)
    throw new MeetingRequestError(problem.message, problem.code, response?.status ?? 0)
  }
}

export const listProjectMeetings = (sectorId: UUID, when: 'upcoming' | 'past') =>
  call(
    () => api.get<Meeting[]>(`/sectors/${sectorId}/meetings/`, { params: { when } }),
    'Não foi possível carregar as reuniões.',
  )

export const createMeeting = (sectorId: UUID, input: MeetingInput) =>
  call(
    () => api.post<Meeting>(`/sectors/${sectorId}/meetings/`, input),
    'Não foi possível agendar a reunião.',
  )

export const getMeeting = (id: UUID) =>
  call(() => api.get<Meeting>(`/meetings/${id}/`), 'Não foi possível abrir a reunião.')

export const updateMeeting = (id: UUID, input: Partial<MeetingInput>) =>
  call(() => api.patch<Meeting>(`/meetings/${id}/`, input), 'Não foi possível salvar a reunião.')

export const deleteMeeting = (id: UUID) =>
  call(() => api.delete<void>(`/meetings/${id}/`), 'Não foi possível cancelar a reunião.')

export const joinMeeting = (id: UUID) =>
  call(
    () => api.post<JoinInfo>(`/meetings/${id}/join/`, { consent: true }),
    'Não foi possível entrar na reunião.',
  )

export const listRecordings = (meetingId: UUID) =>
  call(
    () => api.get<MeetingRecording[]>(`/meetings/${meetingId}/recordings/`),
    'Não foi possível carregar as gravações.',
  )

export const startRecording = (meetingId: UUID) =>
  call(
    () => api.post<MeetingRecording>(`/meetings/${meetingId}/recordings/`),
    'Não foi possível iniciar a gravação.',
  )

export const stopRecording = (meetingId: UUID, recordingId: UUID) =>
  call(
    () => api.post<MeetingRecording>(`/meetings/${meetingId}/recordings/${recordingId}/stop/`),
    'Não foi possível parar a gravação.',
  )

export const deleteRecording = (meetingId: UUID, recordingId: UUID) =>
  call(
    () => api.delete<void>(`/meetings/${meetingId}/recordings/${recordingId}/`),
    'Não foi possível apagar a gravação.',
  )
