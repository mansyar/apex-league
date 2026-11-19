/** The DOM-free live-match surface shared by the server and both clients. */

export {
  createLiveFight,
  type LiveFight,
  type LiveFightConfig,
  type LiveFightOutcome,
} from "./fight"
export { type ParseOutcome, parseMessage, validateMessage } from "./parse"
export {
  type CreateMessage,
  type ErrorMessage,
  type IntentMessage,
  isValidRoomCode,
  type JoinMessage,
  LIVE_ERROR_CODES,
  LIVE_KIND,
  LIVE_PROTOCOL_VERSION,
  type LiveClientMessage,
  type LiveErrorCode,
  type LiveIntent,
  type LiveMessage,
  type LiveServerMessage,
  type LiveVerdictReason,
  MAX_CODE_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_NAME_CHARS,
  MAX_PASSPHRASE_CHARS,
  MAX_TRAINER_ID_CHARS,
  MAX_TRIGGER_CHARS,
  MAX_TRIGGERS,
  MIN_CODE_CHARS,
  type ReadyMessage,
  type SeatIndex,
  type SnapshotMessage,
  type VerdictMessage,
} from "./types"
