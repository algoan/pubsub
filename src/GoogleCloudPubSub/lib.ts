import { GetSubscriptionOptions, GetTopicOptions, PubSub as GPubSub, Subscription, Topic } from '@google-cloud/pubsub';
import { ClientConfig } from '@google-cloud/pubsub/build/src/pubsub';

import { PubSub } from '..';

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
  subscriptionOptions?: Omit<GetSubscriptionOptions, 'autoCreate'>;
  /** Google PubSub topic options */
  topicOptions?: Omit<GetTopicOptions, 'autoCreate'>;
}
