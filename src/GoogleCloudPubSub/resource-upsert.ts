import { GetTopicOptions, Subscription, Topic, PubSub as GPubSub } from '@google-cloud/pubsub';

import { GCSubscriptionOptions } from './lib';
import { isAlreadyExistsError } from './grpc-errors';

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
