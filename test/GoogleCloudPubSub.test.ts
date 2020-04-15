import test, { CbExecutionContext, ExecutionContext } from 'ava';
const Emulator = require('google-pubsub-emulator');

import { PubSubFactory, Transport } from '../src';
import { ExtendedMessage } from '../src/GoogleCloudPubSub/ExtendedMessage';
import { PubSub } from '../src/PubSub';

const projectId: string = 'algoan-test';

let emulator: any;

interface OnMessage {
  hello: string;
}

test.before(async () => {
  emulator = new Emulator({
    project: projectId,
  });

  return emulator.start();
});

test.after.always(async () => {
  return emulator.stop();
});

test.cb('GPS001 - should properly emit and listen', (t: CbExecutionContext): void => {
  const topicName: string = 'test_a_created';
  const pubSub: PubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      debug: true,
    },
  });

  void pubSub.listen<OnMessage>(topicName, {
    autoAck: true,
    onMessage(data: ExtendedMessage<OnMessage>): void {
      t.is(data.parsedData.hello, 'world');
      t.is(data.parsedData._eventName, topicName);
      t.truthy(data.parsedData.time);
      t.pass(`Listen successfully to the topic ${topicName}`);
      t.end();
    },
  });

  /**
   * The first client emit on a topic
   */
  setTimeout((): void => {
    void pubSub.emit(topicName, { hello: 'world' });
  }, 500);
});

test.cb(
  'GPS002 - should properly emit and but the ack method is never called - no ack',
  (t: CbExecutionContext): void => {
    const topicName: string = 'test_b_created';
    const pubSub: PubSub = PubSubFactory.create({
      transport: Transport.GOOGLE_PUBSUB,
      options: {
        projectId,
        namespace: 'test-app',
        environment: 'test',
      },
    });

    void pubSub.listen(topicName, {
      onMessage(data: ExtendedMessage<OnMessage>): void {
        t.is(data.parsedData.hello, 'world');
        t.is(data.parsedData._eventName, topicName);
        t.truthy(data.parsedData.time);
        t.deepEqual(data.message.attributes, {
          namespace: 'test-app',
          environment: 'test',
        });
        t.pass(`Listen successfully to the topic ${topicName}`);
        t.end();
      },
      autoAck: false,
    });

    /**
     * The first client emit on a topic
     */
    setTimeout(() => {
      void pubSub.emit(
        topicName,
        { hello: 'world' },
        {
          topicOptions: {
            longrunning: {
              totalTimeoutMillis: 10,
              initialRetryDelayMillis: 2,
              maxRetryDelayMillis: 9,
              retryDelayMultiplier: 1,
            },
          },
        },
      );
    }, 500);
  },
);

test('GPS003 - should add prefix to subscription and topic', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = 'topic_1';
  const pubsub: PubSub = PubSubFactory.create({
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
  const topicName: string = 'topic_2';
  const pubsub: PubSub = PubSubFactory.create({
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
