/**
 * Message emitted by the PubSub
 */
export interface EmittedMessage<T> {
  /** Message unique identifier */
  id: string;
  /** Payload sent */
  payload: T | { code: string; err: unknown };
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
