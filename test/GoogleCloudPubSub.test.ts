/* eslint-disable max-lines */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable no-void */
import test, { ExecutionContext } from 'ava';
import * as sinon from 'sinon';

import { GCPubSub, PubSubFactory, Transport } from '../src';
import { ExtendedMessage } from '../src/GoogleCloudPubSub';

import { generateRandomTopicName } from './utils/tools';
import { TestUtils } from './utils/test-utils';

const Emulator = require('google-pubsub-emulator');

const projectId: string = 'algoan-test';
let ackSpy: sinon.SinonSpy;

let emulator: any;

test.before(async () => {
  emulator = new Emulator({
    project: projectId,
    debug: process.env.EMULATOR_DEBUG === 'true',
  });

  ackSpy = sinon.spy(ExtendedMessage.prototype, 'ack');

  return emulator.start();
});

test.afterEach(() => {
  ackSpy.resetHistory();
});

test.after.always(async () => {
  return emulator.stop();
});

test('GPS001a - should properly emit and listen', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
    },
  });
  const testUtils = new TestUtils(pubSub, topicName, t);

  await testUtils.validateListenAndEmit((message) => {
    t.true(ackSpy.calledOnce);
    t.true(ackSpy.called);
    t.is(message.count, 0);
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

  const testUtils = new TestUtils(pubSub, topicName, t, {
    options: {
      publishOptions: {
        messageOrdering: true,
      },
      messageOptions: {
        orderingKey,
      },
    },
  });

  await testUtils.validateListenAndEmit((message) => {
    t.true(ackSpy.calledOnce);
    t.true(ackSpy.called);
    t.is(message.orderingKey, orderingKey);
    t.is(message.count, undefined);
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

  const testUtils = new TestUtils(pubSub, topicName, t);

  await testUtils.validateListenAndEmit((message) => {
    t.true(ackSpy.calledOnce);
    t.true(ackSpy.called);
    t.is(message.count, 0);
  });
});

test('GPS001d - should properly emit, but not listen to the subscription', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
    },
  });

  const testUtils = new TestUtils(pubSub, topicName, t);

  await testUtils.validateNotListeningAndEmit(topicName);

  t.pass('Test succeeded, because no message was received');
});

test('GPS001e - should properly emit and listen because wrong topic name to unsubscribe', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
    },
  });

  const testUtils = new TestUtils(pubSub, topicName, t);

  await testUtils.validateNotListeningAndEmit('wrong_subscription_or_topic_name', true, (message) => {
    t.true(ackSpy.calledOnce);
    t.true(ackSpy.called);
    t.is(message.count, 0);
  });
});

test('GPS001f - should properly emit, but not listen to the subscription with a prefix', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      subscriptionsPrefix: 'my-prefix',
    },
  });

  const testUtils = new TestUtils(pubSub, topicName, t);

  await testUtils.validateNotListeningAndEmit(topicName);

  t.pass('Test succeeded, because no message was received');
});

test('GPS001g - should properly emit, but not listen to the subscription with a custom name and a prefix', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const customSubscriptionName = 'completely-different-name';
  const pubSub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      subscriptionsPrefix: 'my-prefix',
    },
  });

  const testUtils = new TestUtils(pubSub, topicName, t);

  await testUtils.validateNotListeningAndEmit(customSubscriptionName, false, undefined, {
    autoAck: true,
    subscriptionOptions: {
      name: customSubscriptionName,
    },
  });

  t.pass('Test succeeded, because no message was received');
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

  const testUtils = new TestUtils(pubSub, topicName, t);

  await testUtils.validateListenAndEmit(
    (message) => {
      t.false(ackSpy.called);
      t.deepEqual(message.metadata, {
        namespace: 'test-app',
        environment: 'test',
      });
      t.is(message.count, 0);
    },
    {
      autoAck: false,
      subscriptionOptions: {
        sub: {
          streamingOptions: {
            maxStreams: 1,
          },
        },
      },
    },
  );
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

  const testUtils = new TestUtils(pubSub, topicName, t);

  await testUtils.validateListenAndEmit(
    (message) => {
      t.false(ackSpy.called);
      message.ack();
      t.deepEqual(message.metadata, {
        namespace: 'test-app',
        environment: 'test',
      });
      t.is(message.count, 0);
    },
    {
      autoAck: false,
    },
  );
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

test('GPS013 - should throw an error because the subscription is not created', async (t: ExecutionContext): Promise<void> => {
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

  const [[createdTopic]] = await Promise.all([pubsub.client.createTopic(topicName)]);
  try {
    await pubsub.listen(subscriptionName, {
      options: {
        topicName: createdTopic.name,
        topicOptions: {
          autoCreate: false,
        },
        subscriptionOptions: {
          get: {
            autoCreate: false,
          },
        },
      },
    });

    t.fail('This promise is not supposed to be resolved, since the subscription does not exist!');
  } catch (err) {
    t.is(
      (err as Error).message,
      `[@algoan/pubsub] The subscription ${subscriptionName} is not found in topic projects/${projectId}/topics/${topicName}`,
    );
  }
});

test('GPS014a - should auto-create a per-subscription dead-letter topic named <subscriptionName>-deadletter', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      deadLetterOptions: {},
    },
  });

  const authRequestStub = sinon.stub(pubsub.client.auth, 'request').resolves({
    data: { projectNumber: '123456789' },
  } as any);

  const iamGetPolicyStub = sinon.stub().resolves([{ bindings: [] }]);
  const iamSetPolicyStub = sinon.stub().resolves([{}]);

  const originalTopic = pubsub.client.topic.bind(pubsub.client);
  const topicStub = sinon.stub(pubsub.client, 'topic').callsFake((name: string) => {
    const topic = originalTopic(name);
    topic.iam.getPolicy = iamGetPolicyStub;
    topic.iam.setPolicy = iamSetPolicyStub;
    return topic;
  });

  try {
    await pubsub.listen(topicName);

    const [isSubExisting] = await pubsub.client.subscription(topicName).exists();
    const sanitizedSubName = topicName.replace(/[^a-zA-Z0-9\-_.~]/g, '-');
    const dltShortName = `${sanitizedSubName}-deadletter`;
    const [isDltTopicExisting] = await pubsub.client.topic(dltShortName).exists();
    const [isDrainSubExisting] = await pubsub.client.subscription(`${dltShortName}-sub`).exists();

    t.true(isSubExisting, 'subscription should be created');
    t.true(isDltTopicExisting, 'dead-letter topic should be auto-created per subscription');
    t.true(
      isDrainSubExisting,
      'drain subscription should be auto-created on dead-letter topic to prevent message loss',
    );

    t.true(authRequestStub.calledOnce, 'should fetch project number for IAM setup');
    t.true(iamGetPolicyStub.calledOnce, 'should get dead-letter topic IAM policy');

    const setPolicyCall = iamSetPolicyStub.getCall(0);
    const bindings = setPolicyCall.args[0].bindings as Array<{ role: string; members: string[] }>;
    t.true(
      bindings.some(
        (b) =>
          b.role === 'roles/pubsub.publisher' &&
          b.members.includes('serviceAccount:service-123456789@gcp-sa-pubsub.iam.gserviceaccount.com'),
      ),
      'should grant publisher role on dead-letter topic to Pub/Sub service account',
    );
  } finally {
    authRequestStub.restore();
    topicStub.restore();
  }
});

test('GPS014b - should skip dead-letter setup entirely when calling listen on an already-existing subscription', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      deadLetterOptions: {},
    },
  });

  const authRequestStub = sinon.stub(pubsub.client.auth, 'request').resolves({
    data: { projectNumber: '123456789' },
  } as any);

  const iamGetPolicyStub = sinon.stub().resolves([{ bindings: [] }]);
  const iamSetPolicyStub = sinon.stub().resolves([{}]);

  const originalTopic = pubsub.client.topic.bind(pubsub.client);
  const topicStub = sinon.stub(pubsub.client, 'topic').callsFake((name: string) => {
    const topic = originalTopic(name);
    topic.iam.getPolicy = iamGetPolicyStub;
    topic.iam.setPolicy = iamSetPolicyStub;
    return topic;
  });

  try {
    await pubsub.listen(topicName);

    iamGetPolicyStub.resetHistory();
    iamSetPolicyStub.resetHistory();
    authRequestStub.resetHistory();

    await pubsub.listen(topicName);

    t.true(authRequestStub.notCalled, 'should not re-run IAM setup for an existing subscription');
    t.true(iamGetPolicyStub.notCalled, 'should not call getPolicy again for an existing subscription');
    t.true(iamSetPolicyStub.notCalled, 'should not call setPolicy again for an existing subscription');
  } finally {
    authRequestStub.restore();
    topicStub.restore();
  }
});

test('GPS014d - should use per-subscription deadLetterTopicName override instead of auto-deriving', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const customDltName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
      deadLetterOptions: {},
    },
  });

  await pubsub.client.createTopic(customDltName);

  const authRequestStub = sinon.stub(pubsub.client.auth, 'request').resolves({
    data: { projectNumber: '123456789' },
  } as any);

  const iamGetPolicyStub = sinon.stub().resolves([{ bindings: [] }]);
  const iamSetPolicyStub = sinon.stub().resolves([{}]);

  const originalTopic = pubsub.client.topic.bind(pubsub.client);
  const topicStub = sinon.stub(pubsub.client, 'topic').callsFake((name: string) => {
    const topic = originalTopic(name);
    topic.iam.getPolicy = iamGetPolicyStub;
    topic.iam.setPolicy = iamSetPolicyStub;
    return topic;
  });

  try {
    await pubsub.listen(topicName, {
      options: {
        subscriptionOptions: {
          deadLetterTopicName: customDltName,
        },
      },
    });

    const [isAutoDltExisting] = await pubsub.client.topic(`${topicName}-deadletter`).exists();
    const [isCustomDltExisting] = await pubsub.client.topic(customDltName).exists();

    t.false(isAutoDltExisting, 'auto-derived dead-letter topic should not be created');
    t.true(isCustomDltExisting, 'the custom dead-letter topic provided via subscriptionOptions should be used');
  } finally {
    authRequestStub.restore();
    topicStub.restore();
  }
});

test('GPS014c - should not create dead-letter resources when deadLetterOptions is not set', async (t: ExecutionContext): Promise<void> => {
  const topicName: string = generateRandomTopicName();
  const pubsub: GCPubSub = PubSubFactory.create({
    transport: Transport.GOOGLE_PUBSUB,
    options: {
      projectId,
    },
  });

  await pubsub.listen(topicName);

  const [isDltTopicExisting] = await pubsub.client.topic(`${topicName}-deadletter`).exists();

  t.false(isDltTopicExisting);
});
