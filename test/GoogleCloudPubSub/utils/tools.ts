import { v4 } from 'uuid';
import { Subscription, Topic } from '@google-cloud/pubsub';
import { PubSub } from '../../../src';

/**
 * Generate a random topic name
 */
export const generateRandomChannelName = (): string => `channel_${v4()}`;

/**
 * Clear topic and subscription cache from pubsub instance
 */
export const clearCache = async (pubsub: PubSub): Promise<void> => {
  /** Remove all subscriptions and topics */
  for (const [, sub] of pubsub['subscriptions']) {
    await sub.close();
    await sub.delete();
  }
  for (const [, topic] of pubsub['topics']) {
    await topic.delete();
  }
  (pubsub as any).subscriptions.clear();
  (pubsub as any).topics.clear();
};
