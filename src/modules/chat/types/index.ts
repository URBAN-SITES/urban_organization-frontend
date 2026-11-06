import type { UUID, ISODateTime } from '@/shared/types'

export interface ChatAttachment {
  id: UUID
  file_name: string
  mime_type: string
  size_bytes: number
  url: string
}
export interface ChatTaskReference {
  id: UUID
  title: string
  sector_id: UUID
  status: string
  completed: boolean
}
export interface ChatMention {
  id: UUID
  name: string
}
export interface ChatReaction {
  emoji: string
  user_ids: UUID[]
}
/** Present on the summary message posted when a call ends. */
export interface ChatCallSummary {
  id: UUID
  kind: CallKind
  status: CallStatus
  duration_seconds: number
}
export interface ChatMessage {
  id: UUID
  channel_id: UUID
  author_id: UUID
  author_name: string
  content: string
  reply_to_id: UUID | null
  task: ChatTaskReference | null
  mentions: ChatMention[]
  attachments: ChatAttachment[]
  reactions: ChatReaction[]
  call: ChatCallSummary | null
  created_at: ISODateTime
  edited_at: ISODateTime | null
  deleted_at: ISODateTime | null
}
export type ChatChannelKind = 'organization' | 'team' | 'teams' | 'sector' | 'direct'
export interface ChatLastMessage {
  id: UUID
  author_name: string
  content: string
  has_attachments: boolean
  created_at: ISODateTime
}
export interface ChatChannel {
  id: UUID
  kind: ChatChannelKind
  name: string
  team_id: UUID | null
  team_ids: UUID[]
  sector_id: UUID | null
  unread_count: number
  member_count: number
  online: boolean | null
  last_message: ChatLastMessage | null
}
export interface OpenDirectChatRequest {
  user_id: UUID
}
export interface CreateTeamsChannelRequest {
  team_ids: UUID[]
  name?: string
}
/** Files must be sent using multipart/form-data. */
export interface WriteChatMessageRequest {
  content?: string
  reply_to?: UUID | null
  task?: UUID | null
  mentions?: UUID[]
  files?: File[]
}
export interface EditChatMessageRequest {
  content: string
}

export type CallKind = 'audio' | 'video'
export type CallStatus = 'ringing' | 'ongoing' | 'ended' | 'missed' | 'declined'
export interface CallParticipant {
  user_id: UUID
  name: string
  state: 'invited' | 'joined' | 'declined' | 'left'
  muted: boolean
  video_off: boolean
  screen_sharing: boolean
}
export interface Call {
  id: UUID
  channel_id: UUID
  organization_id: UUID
  kind: CallKind
  status: CallStatus
  started_by: { id: UUID; name: string } | null
  participants: CallParticipant[]
  created_at: ISODateTime
  answered_at: ISODateTime | null
  ended_at: ISODateTime | null
  duration_seconds: number
}
export type CallMediaFlags = Partial<
  Pick<CallParticipant, 'muted' | 'video_off' | 'screen_sharing'>
>
/** WebRTC payload relayed by the server as is. */
export interface CallSignalData {
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}
/** Server -> client call events on /ws/ (see backend docs/LIGACOES.md). */
export type CallEvent =
  | { type: 'call.ringing'; call: Call }
  | { type: 'call.participant_joined' | 'call.media'; call_id: UUID; participant: CallParticipant }
  | { type: 'call.participant_left' | 'call.declined'; call_id: UUID; user_id: UUID }
  | { type: 'call.signal'; call_id: UUID; from_user_id: UUID; data: CallSignalData }
  | { type: 'call.ended'; call_id: UUID; status: CallStatus }
  | { type: 'call.error'; call_id: UUID; detail: string }

export type * from './ui'
