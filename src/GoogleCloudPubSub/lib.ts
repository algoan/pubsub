import {
  CreateSubscriptionOptions,
  GetSubscriptionOptions,
  GetTopicOptions,
  PubSub as GPubSub,
  Subscription,
  SubscriptionOptions,
  Topic,
} from '@google-cloud/pubsub';
import { ClientConfig } from '@google-cloud/pubsub/build/src/pubsub';
import { MessageOptions, PublishOptions } from '@google-cloud/pubsub/build/src/topic';
import { pino } from 'pino';

import { PubSub } from '..';

/**
 * Dead letter policy options for subscription creation
 */
export interface DeadLetterOptions {
  /**
   * Fully-qualified dead-letter topic name shared across all subscriptions
   * (e.g. projects/<project>/topics/<name>).
   * When omitted, each subscription automatically gets its own
   * <subscriptionName>-deadletter topic.
   */
  deadLetterTopicName?: string;
  /** Maximum number of delivery attempts before forwarding to dead-letter topic (min: 5, max: 100) */
  maxDeliveryAttempts?: number;
}

/**
 * Extends Google PubSub config
 */
export interface GooglePubSubOptions extends ClientConfig {
  topicsPrefix?: string;
  topicsSeparator?: string;
  subscriptionsPrefix?: string;
  subscriptionsSeparator?: string;
  namespace?: string;
  environment?: string;
  debug?: boolean;
  pinoOptions?: pino.LoggerOptions;
  /** Dead letter policy applied when creating new subscriptions */
  deadLetterOptions?: DeadLetterOptions;
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
 * PubSub SDK for Google Cloud
 */
export type GCPubSub = PubSub<GPubSub, Subscription, GCListenOptions>;

/**
 * Google Cloud PubSub Listen options
 */
export interface GCListenOptions {
  /** Automatic Acknowledgment */
  autoAck?: boolean;
  /** Google PubSub subscription options */
  subscriptionOptions?: GCSubscriptionOptions;
  /** Google PubSub topic options */
  topicOptions?: GetTopicOptions;
  /** Publishing message options */
  messageOptions?: Omit<MessageOptions, 'json' | 'data'>;
  /** Topic Publish options */
  publishOptions?: PublishOptions;
  /** Topic name, if you want a different name than the subscription */
  topicName?: string;
}

/**
 * Mix Subscriptions Options interface
 */
export interface GCSubscriptionOptions {
  /** Subscription name. Default to topic name if not provided */
  name?: string;
  /** Options applied to the getSubscription: https://googleapis.dev/nodejs/pubsub/latest/v1.SubscriberClient.html#getSubscription */
  get?: GetSubscriptionOptions;
  /** Options applied to the subscription: https://googleapis.dev/nodejs/pubsub/latest/Subscription.html#setOptions */
  sub?: SubscriptionOptions;
  /** Options applied to the createSubscription  */
  create?: CreateSubscriptionOptions;
  /**
   * Per-subscription override for the dead-letter topic name.
   * Falls back to deadLetterOptions.deadLetterTopicName on the instance,
   * then auto-derives <subscriptionName>-deadletter if neither is provided.
   * Only used when deadLetterOptions is configured on the GoogleCloudPubSub instance.
   */
  deadLetterTopicName?: string;
}

/**
 * Payload interface if a JSON parsing error occurs
 */
export interface ErrorPayload {
  code: string;
  err: unknown;
}
