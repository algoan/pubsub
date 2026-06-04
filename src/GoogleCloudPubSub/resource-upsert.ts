import { GetTopicOptions, Subscription, Topic, PubSub as GPubSub } from '@google-cloud/pubsub';

import { GCSubscriptionOptions } from './lib';
import { isAlreadyExistsError } from './grpc-errors';

/**
 * Creates a topic or retrieves it if it already exists.
 * Falls back to a plain get when the initial create-with-autoCreate call fails
 * with an ALREADY_EXISTS error, which can happen during concurrent deployments.
 * @param client - The Google Cloud Pub/Sub client
 * @param name - Fully-qualified or short topic name
 * @param getTopicOptions - Optional options forwarded to the underlying get call
 */
export const createTopicOrGet = async (
  client: GPubSub,
  name: string,
  getTopicOptions?: GetTopicOptions,
): Promise<Topic> => {
  try {
    const [topic] = await client.topic(name).get({ autoCreate: true, ...getTopicOptions });

    return topic;
  } catch (error: unknown) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }

    const [topic] = await client.topic(name).get({ ...getTopicOptions, autoCreate: false });

    return topic;
  }
};

/**
 * Creates a subscription or retrieves it if it already exists.
 * Falls back to get when create fails with an ALREADY_EXISTS error, handling
 * race conditions where multiple pods try to create the same subscription simultaneously.
 * @param sub - The Subscription instance to create or retrieve
 * @param createOptions - Options forwarded to the create call
 * @param getOptions - Options forwarded to the fallback get call
 */
export const createSubscriptionOrGet = async (
  sub: Subscription,
  createOptions: GCSubscriptionOptions['create'],
  getOptions: GCSubscriptionOptions['get'],
): Promise<Subscription> => {
  try {
    const [createdSubscription] = await sub.create(createOptions);

    return createdSubscription;
  } catch (error: unknown) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }

    const [existingSubscription] = await sub.get(getOptions);

    return existingSubscription;
  }
};
