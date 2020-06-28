import { ErrorPayload } from './GoogleCloudPubSub';

/**
 * Message emitted by the PubSub
 */
export interface EmittedMessage<T> {
  /** Message unique identifier */
  id: string;
  /** Payload sent */
  payload: T | ErrorPayload;
  /** Metadata: namespace, environment etc */
  metadata?: Metadata;
  /** Acknowledgment unique identifier */
  ackId?: string;
  /** Counter, if message are ordered */
  count?: number;
  /** Date of emission */
  emittedAt: Date;
  /** Date of reception */
  receivedAt: Date;
  /** Duration in ms */
  duration: number;
}

/**
 * Payload metadata
 */
export interface Metadata {
  namespace?: string;
  environment?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Check if a message is in an error state
 * @param payload
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/tslint/config
export const isPayloadError = <T>(payload: T | ErrorPayload): payload is ErrorPayload =>
  'code' in payload && 'error' in payload;
