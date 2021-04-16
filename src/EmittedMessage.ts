import { ErrorPayload } from './GoogleCloudPubSub';
import { Message } from '@google-cloud/pubsub';

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
  /** Acknowledge method for pubsub providers with a manual acknowledgment */
  ack(): void;
  /** Modify Acknowledge method for pubsub providers with a manual acknowledgment */
  modAck(deadline: number): void;
  /** Not-Acknowledge method for pubsub providers with a manual acknowledgment */
  nack(): void;
  /** Getter for retrieving the original message for custom use case */
  getOriginalMessage(): Message;
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
