import { Message } from '@google-cloud/pubsub';
import { Payload } from './lib';

export type ExtendedPayload<T> = T & Payload;
/**
 * Extends the Google PubSub message class by adding a parsed data getter
 */
export class ExtendedMessage<T> {
  /**
   * Message's data buffer parsed
   */
  public readonly parsedData: ExtendedPayload<T>;

  /**
   * Base message
   */
  public readonly message: Message;

  constructor(message: Message) {
    // tslint:disable-next-line: no-unsafe-any
    this.parsedData = JSON.parse(message.data.toString());
    this.message = message;
  }
}
