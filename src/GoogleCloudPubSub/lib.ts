import {
  GetSubscriptionOptions,
  GetTopicOptions,
  PubSub as GPubSub,
  Subscription,
  SubscriptionOptions,
  Topic,
} from '@google-cloud/pubsub';
import { ClientConfig } from '@google-cloud/pubsub/build/src/pubsub';
import { LoggerOptions } from 'pino';

import { PubSub } from '..';

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
  pinoOptions?: LoggerOptions;
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
  topicOptions?: Omit<GetTopicOptions, 'autoCreate'>;
}

/**
 * Mix Subscriptions Options interface
 */
export interface GCSubscriptionOptions {
  /** Options applied to the getSubscription: https://googleapis.dev/nodejs/pubsub/latest/v1.SubscriberClient.html#getSubscription */
  get?: Omit<GetSubscriptionOptions, 'autoCreate'>;
  /** Options applied to the subscription: https://googleapis.dev/nodejs/pubsub/latest/Subscription.html#setOptions */
  sub?: SubscriptionOptions;
}

/**
 * Payload interface if a JSON parsing error occurs
 */
export interface ErrorPayload {
  code: string;
  err: unknown;
}
