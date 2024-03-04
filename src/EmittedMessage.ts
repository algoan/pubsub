import { AnyProperties } from './lib';

/**
 * Message emitted by the PubSub
 */
export interface EmittedMessage {
  /** Message unique identifier */
  id: string;
  /** Payload sent */
  payload: AnyProperties;
  /** Metadata: namespace, environment etc */
  metadata?: AnyProperties<string>;
  /** Acknowledgment unique identifier */
  ackId?: string;
  /** Date of emission */
  emittedAt: Date;
  /** Date of reception */
  receivedAt: Date;
  /** Duration in ms */
  duration: number;
  /** Ordering Key */
  orderingKey?: string;
  /** Number of attempts to deliver the message */
  deliveryAttempt?: number;
  /** Acknowledge method for pubsub providers with a manual acknowledgment */
  ack(): Promise<void> | void;
  /** Modify Acknowledge method for pubsub providers with a manual acknowledgment. Deadline in seconds */
  modAck(deadline: number): void;
  /** Not-Acknowledge method for pubsub providers with a manual acknowledgment */
  nack(): Promise<void> | void;
  /** Getter for retrieving the original message for custom use case */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOriginalMessage(): any;
}
