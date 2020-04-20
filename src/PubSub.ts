import { EmittedMessage, Metadata } from './EmittedMessage';

/**
 * PubSub generic interface
 */
export interface PubSub<PSClient, PSSubscription, SubscriptionOptions> {
  /**
   * The exposed PubSub client
   * If it is Google, then PSClient = PubSub
   * https://github.com/googleapis/nodejs-pubsub/blob/master/src/pubsub.ts#L235
   */
  client: PSClient;
  /**
   * Exposed cached subscriptions
   * If it is Google, then PSSubscription = Subscription
   * https://github.com/googleapis/nodejs-pubsub/blob/master/src/subscription.ts#L211
   */
  subscriptions: Map<string, PSSubscription>;
  /**
   * Listen to a subscription
   * @param event Event to listen to
   * @param options Message handler
   */
  listen<MessagePayload>(event: string, options?: ListenOptions<MessagePayload, SubscriptionOptions>): Promise<void>;

  /**
   * Emit an event
   * @param event Event to emit
   * @param data Payload to send
   * @param options Options related to the emit options
   */
  emit(event: string, data: object, options?: EmitOptions<SubscriptionOptions>): Promise<string>;
}

/**
 * Listen options argument
 */
export interface ListenOptions<T, Options> {
  /** Error handler */
  onError?(error: Error): void;
  /** Message handler */
  onMessage?(extendedMessage: EmittedMessage<T>): void;
  /** Options */
  options?: Options;
}

/**
 * Emit options argument
 */
export interface EmitOptions<Options> {
  metadata?: Metadata;
  options?: Options;
}
