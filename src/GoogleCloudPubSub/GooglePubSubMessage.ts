import { Message } from '@google-cloud/pubsub';

import { EmittedMessage } from '..';
import { AnyProperties } from '../lib';

/**
 * Extends the Google PubSub message class by adding a parsed data getter
 */
export class GooglePubSubMessage implements EmittedMessage {
  /** Message unique identifier */
  public id: string;
  /** Payload sent */
  public payload: AnyProperties;
  /** Metadata related to the message */
  public metadata?: AnyProperties<string>;
  /** Acknowledgment unique identifier */
  public ackId?: string;
  /** Date of emission */
  public emittedAt: Date;
  /** Date of reception */
  public receivedAt: Date;
  /** Duration in ms */
  public duration: number;
  /** Ordering key if it exists */
  public orderingKey?: string;
  /** Delivery attempts */
  public deliveryAttempt?: number;
  /** GoogleCloud ack method, is defined if autoAck is disable */
  private readonly originalMessage: Message;

  constructor(message: Message) {
    this.id = message.id;
    this.payload = GooglePubSubMessage.safeJSONParse(message.data.toString());
    this.metadata = message.attributes;
    this.ackId = message.ackId;
    this.emittedAt = message.publishTime;
    this.receivedAt = new Date(message.received);
    this.duration = message.received - this.emittedAt.valueOf();
    this.originalMessage = message;
    this.orderingKey = message.orderingKey === '' ? undefined : message.orderingKey;
    this.deliveryAttempt = message.deliveryAttempt;
  }

  /**
   * Shared ack() method.
   * If the exactlyOnceDelivery is not enabled, this promise will always resolve
   * Use it if "autoAck" is disabled
   */
  public async ack(): Promise<void> {
    await this.originalMessage.ackWithResponse();
  }

  /**
   * Shared modAck() method.
   * If the exactlyOnceDelivery is not enabled, this promise will always resolve
   * Use it if "autoAck" is disabled
   */
  public async modAck(deadline: number): Promise<void> {
    await this.originalMessage.modAckWithResponse(deadline);
  }

  /**
   * Shared nack() method.
   * If the exactlyOnceDelivery is not enabled, this promise will always resolve
   * Use it if "autoAck" is disabled
   */
  public async nack(): Promise<void> {
    await this.originalMessage.nackWithResponse();
  }
  /**
   * Getter for retrieving the original message.
   * Use it if extended message is not helpful
   */
  public getOriginalMessage(): Message {
    return this.originalMessage;
  }

  /**
   * Safely parse a string
   * @param stringToParse String to parse
   */
  private static safeJSONParse<T>(stringToParse: string): T | Record<string, never> {
    try {
      // eslint-disable-next-line @typescript-eslint/tslint/config
      const json: T = JSON.parse(stringToParse);

      return json;
    } catch {
      return {};
    }
  }
}
