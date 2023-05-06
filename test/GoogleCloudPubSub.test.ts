/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable no-void */
import test, { CbExecutionContext, ExecutionContext } from 'ava';
import * as sinon from 'sinon';

import { EmittedMessage, GCPubSub, isPayloadError, PubSubFactory, Transport } from '../src';
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

test.cb('GPS001a - should properly emit and listen', (t: CbExecutionContext): void => {
  const topicName: string = generateRandomTopicName();
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
    },
  });

  void pubSub.listen(topicName, {
    options: {
      autoAck: true,
    },
    onMessage(message: EmittedMessage<OnMessage>): void {
      const spy: sinon.SinonSpy = sinon.spy(message.getOriginalMessage(), 'ack');
      if (isPayloadError(message.payload)) {
        return t.end('Error in payload');
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
      t.end();
    },
  });

  /**
   * The first client emit on a topic
   */
  setTimeout((): void => {
    void pubSub.emit(topicName, { hello: 'world' });
  }, 1000);
});

test.cb('GPS001b - should properly emit and listen with ordering key', (t: CbExecutionContext): void => {
  const topicName: string = generateRandomTopicName();
  const orderingKey: string = 'key1';
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
    },
  });

  void pubSub.listen(topicName, {
    options: {
      autoAck: true,
    },
    onMessage(message: EmittedMessage<OnMessage>): void {
      const spy: sinon.SinonSpy = sinon.spy(message.getOriginalMessage(), 'ack');
      if (isPayloadError(message.payload)) {
        return t.end('Error in payload');
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
      t.end();
    },
  });

  /**
   * The first client emit on a topic
   */
  setTimeout((): void => {
    void pubSub.emit(
      topicName,
      { hello: 'world' },
      {
        options: {
          publisherOptions: {
            messageOrdering: true,
          },
          messageOptions: {
            orderingKey,
          },
        },
      },
    );
  }, 1000);
});

test.cb('GPS002 - should properly emit but the ack method is never called - no ack', (t: CbExecutionContext): void => {
  const topicName: string = generateRandomTopicName();
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      namespace: 'test-app',
      environment: 'test',
    },
  });

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
      t.end();
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
  });

  /**
   * The first client emit on a topic
   */
  setTimeout((): void => {
    void pubSub.emit(topicName, { hello: 'world' });
  }, 1000);
});

test.cb('GPS002a - should properly emit and properly ack manually', (t: CbExecutionContext): void => {
  const topicName: string = generateRandomTopicName();
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      namespace: 'test-app',
      environment: 'test',
    },
  });

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
      t.end();
    },
    options: {
      autoAck: false,
    },
  });

  /**
   * The first client emit on a topic
   */
  setTimeout((): void => {
    void pubSub.emit(topicName, { hello: 'world' });
  }, 1000);
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
