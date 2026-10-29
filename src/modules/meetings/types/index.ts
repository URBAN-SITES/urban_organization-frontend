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
  /** transcrição e resumo; null quando ainda não existem */
  insight_status: InsightStatus | null
}

export type InsightStatus = 'pending' | 'transcribing' | 'summarizing' | 'done' | 'failed'

export interface TranscriptSegment {
  id: number
  /** segundos desde o início da gravação */
  start: number
  end: number
  text: string
}

/** Trecho real da transcrição que sustenta um item do resumo. */
export interface SummarySource {
  segment_ids: number[]
  start: number
  end: number
  quote: string
}

export interface SummaryPoint {
  text: string
  source: SummarySource | null
}

export interface SummaryAction {
  title: string
  description: string
  /** null quando a reunião não citou um responsável do projeto */
  assignee_id: UUID | null
  assignee_name: string | null
  /** nome como foi dito, mesmo sem correspondência no projeto */
  assignee_mentioned: string | null
  /** YYYY-MM-DD só quando um prazo foi dito */
  due_date: string | null
  source: SummarySource
  created: boolean
  task_id: UUID | null
}

export interface MeetingSummary {
  executive_summary: string
  topics: { title: string; source: SummarySource | null }[]
  decisions: SummaryPoint[]
  problems: SummaryPoint[]
  next_steps: SummaryPoint[]
  open_questions: SummaryPoint[]
  actions: SummaryAction[]
  /** ações descartadas por não citarem um trecho real */
  dropped_actions: number
}

export interface MeetingInsight {
  id: UUID
  status: InsightStatus
  language: string
  audio_seconds: number
  segments: TranscriptSegment[]
  summary: MeetingSummary | null
  transcribe_model: string
  summary_model: string
  transcribe_seconds: number
  summary_seconds: number
  attempts: number
  error: string
  updated_at: ISODateTime
  finished_at: ISODateTime | null
}

export interface ActionTaskInput {
  index: number
  title: string
  description: string
  assignee: UUID | null
  due_date: string | null
}
