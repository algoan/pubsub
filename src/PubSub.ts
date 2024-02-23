import { EmittedMessage } from './EmittedMessage';
import { PublishOptions, PublishPayload, PubSubOptions, SubscribeOptions } from './lib';

/**
 * PubSub Abstract Class
 */
export abstract class PubSub {
  constructor(protected options?: PubSubOptions) {}
  /**
   * Get access to the native client object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public abstract getNativeClient(): any;
  /**
   * Subscribe to a channel and call the listener when it is called
   * @param channel Name of the channel to subscribe to
   * @param listener Function to execute when a message is published to the channel
   * @param options Options to apply to the subscription
   */
  public abstract subscribe(
    channel: string,
    listener: (message: EmittedMessage) => void,
    options?: SubscribeOptions,
  ): Promise<void>;

  /**
   * Stop listening to a specific channel
   * @param channel Channel to unsubscribe
   */
  public abstract unsubscribe(channel: string): Promise<void>;

  /**
   * Publish data on a specific channel
   * @param channel Name of the channel to publish to
   * @param data Data to send. Could be a batch of messages
   * @param options Options related to the publish method
   */
  public abstract publish(
    channel: string,
    data: PublishPayload | PublishPayload[],
    options?: PublishOptions,
  ): Promise<void>;

  /**
   * Change global options
   * @param options PubSub options
   */
  public setGlobalOptions(options: PubSubOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get full topic name including the topic prefix if it is defined
   * @param topicName Name of the topic
   */
  protected getTopicName(topicName: string) {
    return `${this.options?.topicsPrefix ?? ''}${topicName}`;
  }

  /**
   * Get full subscription name including the subscription prefix if it is defined
   * @param subscriptionName Name of the subscription
   */
  protected getSubscriptionName(subscriptionName: string, prefix?: string) {
    return `${prefix ?? this.options?.subscriptionsPrefix ?? ''}${subscriptionName}`;
  }

  /**
   * Close all connections to the server
   */
  public abstract close(): Promise<void>;
}
