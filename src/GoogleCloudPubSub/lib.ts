import { Attributes, GetSubscriptionOptions, GetTopicOptions, Subscription, Topic } from '@google-cloud/pubsub';
import { ClientConfig } from '@google-cloud/pubsub/build/src/pubsub';
import { ExtendedMessage } from './ExtendedMessage';

/**
 * Extends Google PubSub config
 */
export interface GooglePubSubOptions extends ClientConfig {
  topicsPrefix?: string;
  subscriptionsPrefix?: string;
  namespace?: string;
  environment?: string;
  debug?: boolean;
}

/**
 * A key-map of Topic instances (for cache)
 */
export type TopicMap = Map<string, Topic>;

/**
 * A key-map of Subscription instances (for cache)
 */
export type SubscriptionMap = Map<string, Subscription>;

/**
 * Options used both in emit and listen methods
 */
interface Options {
  subscriptionOptions?: Omit<GetSubscriptionOptions, 'autoCreate'>;
  topicOptions?: Omit<GetTopicOptions, 'autoCreate'>;
}

/**
 * Listen options argument
 */
export interface ListenOptions<T> extends Options {
  autoAck?: boolean;
  /** Error handler */
  onError?(error: Error): void;
  /** Message handler */
  onMessage?(extendedMessage: ExtendedMessage<T>): void;
}

/**
 * Emit options argument
 */
export interface EmitOptions extends Options {
  customAttributes?: Attributes;
}

/**
 * Payload in the emitted message
 */
export interface Payload {
  _eventName: string;
  time: number;
}
