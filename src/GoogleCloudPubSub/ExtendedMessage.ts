import { Attributes, Message } from '@google-cloud/pubsub';

import { EmittedMessage } from '..';
import { ErrorPayload } from './lib';

/**
 * Extends the Google PubSub message class by adding a parsed data getter
 */
export class ExtendedMessage<T> implements EmittedMessage<T> {
  /** Message unique identifier */
  public id: string;
  /** Payload sent */
  public payload: T | ErrorPayload;
  /** Metadata: namespace, environment etc */
  public metadata?: Attributes;
  /** Acknowledgment unique identifier */
  public ackId?: string;
  /** Counter, if message are ordered */
  public count?: number;
  /** Date of emission */
  public emittedAt: Date;
  /** Date of reception */
  public receivedAt: Date;
  /** Duration in ms */
  public duration: number;
  /** GoogleCloud ack method, is defined if autoAck is disable */
  private readonly originalMessage: Message;

  constructor(message: Message) {
    this.id = message.id;
    try {
      // eslint-disable-next-line @typescript-eslint/tslint/config
      this.payload = JSON.parse(message.data.toString());
    } catch (err) {
      this.payload = {
        code: 'JSON_PARSE_ERROR_MESSAGE',
        err,
      };
    }
    this.metadata = message.attributes;
    this.ackId = message.ackId;
    this.count = isNaN(Number(message.orderingKey)) ? undefined : Number(message.orderingKey);
    this.emittedAt = message.publishTime;
    this.receivedAt = new Date(message.received);
    this.duration = message.received - this.emittedAt.valueOf();
    this.originalMessage = message;
  }

  /**
   * Shared ack() method.
   * Use it if "autoAck" is disabled
   */
  public ack(): void {
    this.originalMessage.ack();
  }
}
