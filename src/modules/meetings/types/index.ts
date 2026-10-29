import type { ISODateTime, UUID } from '@/shared/types'

export interface MeetingPerson {
  id: UUID
  name: string
  avatar_url: string
}

export interface Meeting {
  id: UUID
  sector_id: UUID
  title: string
  description: string
  starts_at: ISODateTime
  ends_at: ISODateTime
  created_by: MeetingPerson | null
  participants: MeetingPerson[]
  /** gravações prontas */
  recording_count: number
  can_manage: boolean
  can_join: boolean
  created_at: ISODateTime
}

export interface MeetingInput {
  title: string
  description: string
  starts_at: ISODateTime
  ends_at: ISODateTime
  participants: UUID[]
}

export interface JoinInfo {
  url: string
  token: string
  room: string
  identity: string
  can_record: boolean
  recording: boolean
}

export type RecordingStatus = 'starting' | 'recording' | 'processing' | 'ready' | 'failed'

export interface MeetingRecording {
  id: UUID
  status: RecordingStatus
  started_by: MeetingPerson | null
  started_at: ISODateTime
  ended_at: ISODateTime | null
  duration_seconds: number
  size_bytes: number
  participants: { identity: string; name: string }[]
  error: string
  /** URL assinada, vale 1 hora */
  play_url: string | null
  /** só para quem organiza ou gerencia o projeto */
  download_url: string | null
  /** quando a política de retenção apaga o vídeo */
  expires_at: ISODateTime
}
