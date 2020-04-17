/**
 * Message emitted by the PubSub
 */
export interface EmittedMessage<T> {
  /** Message unique identifier */
  id: string;
  /** Payload sent */
  payload: T;
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
  // tslint:disable-next-line: no-any
  [key: string]: any;
}
