/* eslint-disable max-lines */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable no-void */
import test, { ExecutionContext } from 'ava';
import * as sinon from 'sinon';

import {
  EmitOptions,
  EmittedMessage,
  GCListenOptions,
  GCPubSub,
  isPayloadError,
  PubSubFactory,
  Transport,
} from '../src';
import { OnMessage } from './utils/lib';
import { generateRandomTopicName } from './utils/tools';

const Emulator = require('google-pubsub-emulator');

const projectId: string = 'algoan-test';

let emulator: any;

test.before(async () => {
  emulator = new Emulator({
    project: projectId,
    debug: process.env.EMULATOR_DEBUG === 'true',
  });

  return emulator.start();
});

test.afterEach(() => {
  sinon.restore();
});

test.after.always(async () => {
  return emulator.stop();
});

/**
 * Emit an event after a delay
 * @param pubSub PubSub client
 * @param topicName Topic name to publish to
 * @param delay Delay in ms
 */
function emitAfterDelay(pubSub: GCPubSub, topicName: string, topicOptions: EmitOptions<GCListenOptions> = {}): void {
  setTimeout((): void => {
    void pubSub.emit(topicName, { hello: 'world' }, topicOptions);
  }, 1000);
}

test('GPS001a - should properly emit and listen', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
    },
  });

  await new Promise((resolve, reject) => {
    void pubSub.listen(topicName, {
      options: {
        autoAck: true,
      },
      onMessage(message: EmittedMessage<OnMessage>): void {
        const spy: sinon.SinonSpy = sinon.spy(message.getOriginalMessage(), 'ack');
        if (isPayloadError(message.payload)) {
          return reject('Error in payload');
        }

        const payload: OnMessage = message.payload;
        t.deepEqual(payload, {
          hello: 'world',
        });
        t.falsy(spy.called);
        t.truthy(message.id);
        t.truthy(message.ackId);
        t.truthy(message.emittedAt);
        t.truthy(message.receivedAt);
        t.is(message.count, 0);
        t.truthy(message.duration);
        t.pass(`Listen successfully to the topic ${topicName}`);
        resolve(true);
      },
      onError(error) {
        reject(error);
      },
    });

    emitAfterDelay(pubSub, topicName);
  });
});

test('GPS001b - should properly emit and listen with ordering key', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const orderingKey: string = 'key1';
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
    },
  });

  await new Promise((resolve, reject) => {
    void pubSub.listen(topicName, {
      options: {
        autoAck: true,
      },
      onMessage(message: EmittedMessage<OnMessage>): void {
        const spy: sinon.SinonSpy = sinon.spy(message.getOriginalMessage(), 'ack');
        if (isPayloadError(message.payload)) {
          return reject('Error in payload');
        }

        const payload: OnMessage = message.payload;
        t.deepEqual(payload, {
          hello: 'world',
        });
        t.falsy(spy.called);
        t.truthy(message.id);
        t.truthy(message.ackId);
        t.truthy(message.emittedAt);
        t.truthy(message.receivedAt);
        t.is(message.orderingKey, orderingKey);
        t.is(message.count, undefined);
        t.truthy(message.duration);
        t.pass(`Listen successfully to the topic ${topicName}`);
        resolve(true);
      },
      onError(error) {
        reject(error);
      },
    });

    emitAfterDelay(pubSub, topicName, {
      options: {
        publishOptions: {
          messageOrdering: true,
        },
        messageOptions: {
          orderingKey,
        },
      },
    });
  });
});

test('GPS001c - should properly emit and listen with a prefix', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const topicsPrefix: string = 'pref';
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix,
    },
  });

  await new Promise((resolve, reject) => {
    void pubSub.listen(topicName, {
      options: {
        autoAck: true,
      },
      onMessage(message: EmittedMessage<OnMessage>): void {
        const spy: sinon.SinonSpy = sinon.spy(message.getOriginalMessage(), 'ack');
        if (isPayloadError(message.payload)) {
          return reject('Error in payload');
        }

        const payload: OnMessage = message.payload;
        t.deepEqual(payload, {
          hello: 'world',
        });
        t.falsy(spy.called);
        t.truthy(message.id);
        t.truthy(message.ackId);
        t.truthy(message.emittedAt);
        t.truthy(message.receivedAt);
        t.is(message.count, 0);
        t.truthy(message.duration);
        t.pass(`Listen successfully to the topic ${topicName}`);
        resolve(true);
      },
      onError(error) {
        reject(error);
      },
    });

    emitAfterDelay(pubSub, topicName);
  });
});

test('GPS002 - should properly emit but the ack method is never called - no ack', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      namespace: 'test-app',
      environment: 'test',
    },
  });

  await new Promise((resolve, reject) => {
    void pubSub.listen(topicName, {
      onMessage(message: EmittedMessage<OnMessage>): void {
        const spy: sinon.SinonSpy = sinon.spy(message.getOriginalMessage(), 'ack');
        t.deepEqual(message.payload, {
          hello: 'world',
        });
        t.deepEqual(message.metadata, {
          namespace: 'test-app',
          environment: 'test',
        });
        t.falsy(spy.called);
        t.truthy(message.id);
        t.truthy(message.ackId);
        t.truthy(message.emittedAt);
        t.truthy(message.receivedAt);
        t.is(message.count, 0);
        t.truthy(message.duration);
        t.pass(`Listen successfully to the topic ${topicName}`);
        resolve(true);
      },
      options: {
        autoAck: false,
        subscriptionOptions: {
          sub: {
            streamingOptions: {
              maxStreams: 1,
            },
          },
        },
      },
      onError(error) {
        reject(error);
      },
    });

    emitAfterDelay(pubSub, topicName);
  });
});

test('GPS002a - should properly emit and properly ack manually', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      namespace: 'test-app',
      environment: 'test',
    },
  });

  await new Promise((resolve, reject) => {
    void pubSub.listen(topicName, {
      onMessage(message: EmittedMessage<OnMessage>): void {
        const spy: sinon.SinonSpy = sinon.spy(message.getOriginalMessage(), 'ack');
        message.ack();
        t.deepEqual(message.payload, {
          hello: 'world',
        });
        t.deepEqual(message.metadata, {
          namespace: 'test-app',
          environment: 'test',
        });
        t.truthy(spy.called);
        t.truthy(message.id);
        t.truthy(message.ackId);
        t.truthy(message.emittedAt);
        t.truthy(message.receivedAt);
        t.is(message.count, 0);
        t.truthy(message.duration);
        t.pass(`Listen successfully to the topic ${topicName}`);
        resolve(true);
      },
      options: {
        autoAck: false,
      },
      onError(err) {
        reject(err);
      },
    });

    emitAfterDelay(pubSub, topicName);
  });
});

test('GPS003 - should add prefix to subscription and topic', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix: 'algoan',
      subscriptionsPrefix: 'test-app',
    },
  });

  await pubsub.listen(topicName);

  const [isTopicExisting] = await pubsub.client.topic(`algoan+${topicName}`).exists();
  const [isSubcriptionExisting] = await pubsub.client.subscription(`test-app%${topicName}`).exists();

  t.true(isTopicExisting);
  t.true(isSubcriptionExisting);
});

test('GPS004 - should not add prefix to subscription and topic', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
    },
  });

  await pubsub.listen(topicName);

  const [isTopicExisting] = await pubsub.client.topic(`algoan+${topicName}`).exists();
  const [isSubcriptionExisting] = await pubsub.client.subscription(`test-app%${topicName}`).exists();
  const [isTopicExistingWithoutPrefix] = await pubsub.client.topic(topicName).exists();
  const [isSubcriptionExistingWithoutPrefix] = await pubsub.client.subscription(topicName).exists();

  t.false(isTopicExisting);
  t.false(isSubcriptionExisting);
  t.true(isTopicExistingWithoutPrefix);
  t.true(isSubcriptionExistingWithoutPrefix);
});

test('GPS005 - should add separator to subscription and topic', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix: 'algoan',
      subscriptionsPrefix: 'test-app',
      subscriptionsSeparator: '-',
    },
  });

  await pubsub.listen(topicName);

  const [isTopicExisting] = await pubsub.client.topic(`algoan+${topicName}`).exists();
  const [isSubcriptionExisting] = await pubsub.client.subscription(`test-app-${topicName}`).exists();

  t.true(isTopicExisting);
  t.true(isSubcriptionExisting);
});

test('GPS006 - should not add separator to subscription and topic', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix: 'algoan',
      subscriptionsPrefix: 'test-app',
    },
  });

  await pubsub.listen(topicName);

  const [isTopicExisting] = await pubsub.client.topic(`algoan+${topicName}`).exists();
  const [isSubcriptionExisting] = await pubsub.client.subscription(`test-app%${topicName}`).exists();

  t.true(isTopicExisting);
  t.true(isSubcriptionExisting);
});

test('GPS007 - should add separator to topic name', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix: 'algoan',
      topicsSeparator: '-',
    },
  });

  await pubsub.listen(topicName);

  const [isTopicExisting] = await pubsub.client.topic(`algoan-${topicName}`).exists();

  t.true(isTopicExisting);
});

test('GPS008 - should create subscription with a different name', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const customSubscriptionName: string = 'custom_name';
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix: 'algoan',
      topicsSeparator: '-',
    },
  });

  await pubsub.listen(topicName, {
    options: {
      subscriptionOptions: {
        name: customSubscriptionName,
      },
    },
  });

  const [isTopicExisting] = await pubsub.client.topic(`algoan-${topicName}`).exists();
  const [isSubscriptionExisting] = await pubsub.client
    .topic(`algoan-${topicName}`)
    .subscription(customSubscriptionName)
    .exists();

  t.true(isTopicExisting);
  t.true(isSubscriptionExisting);
});

test('GPS009 - should not create a subscription or a topic', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const customSubscriptionName: string = 'custom_name';
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix: 'algoan',
      topicsSeparator: '-',
    },
  });

  try {
    await pubsub.listen(topicName, {
      options: {
        subscriptionOptions: {
          name: customSubscriptionName,
        },
        topicOptions: {
          autoCreate: false,
        },
      },
    });

    t.fail('This promise is not supposed to be resolved, since the topic does not exist!');
  } catch (err) {
    t.is((err as any)?.details, 'Topic not found');
  }

  const [topics] = await pubsub.client.getTopics();
  const [subscriptions] = await pubsub.client.getSubscriptions();
  t.is(
    topics.find((topic) => topic.name === `projects/${projectId}/topics/${topicName}`),
    undefined,
  );
  t.is(
    subscriptions.find((sub) => sub.name === `projects/${projectId}/subscriptions/${customSubscriptionName}`),
    undefined,
  );
});

test('GPS010 - should use another topic name', async (t: ExecutionContext): Promise<void> => {
  const subscriptionName: string = generateRandomTopicName();
  const topicName: string = 'generateRandomTopicName';
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix: 'algoan',
      topicsSeparator: '-',
    },
  });

  await pubsub.listen(subscriptionName, {
    options: {
      topicName,
    },
  });

  const [isTopicExisting] = await pubsub.client.topic(topicName).exists();
  const [isSubscriptionExisting] = await pubsub.client.topic(topicName).subscription(subscriptionName).exists();

  t.true(isTopicExisting);
  t.true(isSubscriptionExisting);
});

test('GPS011 - should throw an error because the topic is not attached to the subscription', async (t: ExecutionContext): Promise<void> => {
  const subscriptionName: string = generateRandomTopicName();
  const topicName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix: 'algoan',
      topicsSeparator: '-',
    },
  });

  const [[createdTopic], [secondTopic]] = await Promise.all([
    pubsub.client.createTopic(topicName),
    pubsub.client.createTopic('random_topic'),
  ]);
  await createdTopic.createSubscription(subscriptionName);

  try {
    await pubsub.listen(subscriptionName, {
      options: {
        topicName: secondTopic.name,
        topicOptions: {
          autoCreate: false,
        },
      },
    });

    t.fail('This promise is not supposed to be resolved, since the topic does not exist!');
  } catch (err) {
    t.is(
      (err as Error).message,
      `[@algoan/pubsub] The topic ${secondTopic.name} is not attached to this subscription (expects topic ${createdTopic.name})`,
    );
  }
});

test('GPS012 - should properly listen to the already created subscription', async (t: ExecutionContext): Promise<void> => {
  const subscriptionName: string = generateRandomTopicName();
  const topicName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      topicsPrefix: 'algoan',
      topicsSeparator: '-',
    },
  });

  const [createdTopic] = await pubsub.client.createTopic(topicName);
  await createdTopic.createSubscription(subscriptionName);

  await pubsub.listen(subscriptionName, {
    options: {
      topicName: createdTopic.name,
      topicOptions: {
        autoCreate: false,
      },
    },
  });

  const [isTopicExisting] = await pubsub.client.topic(topicName).exists();
  const [isSubscriptionExisting] = await pubsub.client.topic(topicName).subscription(subscriptionName).exists();

  t.true(isTopicExisting);
  t.true(isSubscriptionExisting);
});
