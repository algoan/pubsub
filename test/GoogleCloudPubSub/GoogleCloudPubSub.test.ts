import { GoogleCloudPubSub } from '../../src/GoogleCloudPubSub';
import { EmittedMessage, PubSub, PubSubFactory, Transport } from '../../src';
import { PubSub as GPubSub, Subscription, Topic } from '@google-cloud/pubsub';
import { PubSubOptions, PublishOptions, SubscribeOptions } from '../../src/lib';
import { clearCache, generateRandomChannelName } from './utils/tools';

describe('Tests related to the PubSub Client itself', () => {
  test('GPS001 - should create a pubsub client', () => {
    const pubsub = PubSubFactory.create({
      transport: Transport.GOOGLE_PUBSUB,
      options: {},
    });

    expect(pubsub instanceof GoogleCloudPubSub).toBeTruthy();
    expect(pubsub.getNativeClient() instanceof GPubSub).toBeTruthy();
  });

  test('GPS002 - should create a pubsub client with options', () => {
    const options: PubSubOptions = {
      /** The PUBSUB_EMULATOR_HOST is set by the google-pubsub-emulator lib */
      port: Number(process.env.PUBSUB_EMULATOR_HOST?.split(':')[1]),
      autoCreate: false,
      globalPublishOptions: {},
      globalSubscribeOptions: {},
    };
    const pubsub = PubSubFactory.create({
      transport: Transport.GOOGLE_PUBSUB,
      options,
    });
    const nativeClient = pubsub.getNativeClient();
    expect(pubsub instanceof GoogleCloudPubSub).toBeTruthy();
    expect(nativeClient instanceof GPubSub).toBeTruthy();
    expect(nativeClient.options.port).toEqual(options.port);
    expect((pubsub as any).options).toEqual(options);
  });

  test('GPS003 - should throw an error - unknown transport', () => {
    expect(() =>
      PubSubFactory.create({
        // @ts-ignore
        transport: 'unknown transport',
      }),
    ).toThrow('unknown transport is not a valid transport');
  });

  test('GPS004 - should create a pubsub client - no transport', () => {
    // @ts-ignore
    expect(() => PubSubFactory.create({})).toThrow('undefined is not a valid transport');
  });

  test('GPS005 - should create a pubsub client - no more default transport', () => {
    // @ts-ignore
    expect(() => PubSubFactory.create()).toThrow("Cannot read properties of undefined (reading 'transport')");
  });
});

describe('Tests related to the PubSub close method', () => {
  test('GPS010 - should close all subscriptions', async () => {
    const pubsub = PubSubFactory.create({
      transport: Transport.GOOGLE_PUBSUB,
      options: {
        autoCreate: true,
      },
    });
    const subscriptionMap: Map<string, Subscription> = pubsub['subscriptions'];
    const closeSpy = jest.spyOn(Subscription.prototype, 'close');

    for (let i = 0; i < 5; i++) {
      const channel = generateRandomChannelName();
      await pubsub.subscribe(channel, () => {}, {
        streamingPullOptions: {
          maxStreams: 1,
        },
      });
      expect(subscriptionMap.get(channel)).toBeDefined();
    }

    expect(subscriptionMap.size).toEqual(5);
    await pubsub.close();
    expect(closeSpy).toHaveBeenCalledTimes(5);
    subscriptionMap.forEach((sub) => expect(sub.isOpen).toBeFalsy());
  });

  test('GPS011 - should reject listeners because pubsub object is closed', async () => {
    const pubsub = PubSubFactory.create({
      transport: Transport.GOOGLE_PUBSUB,
      options: {
        autoCreate: true,
      },
    });
    const subscriptionMap: Map<string, Subscription> = pubsub['subscriptions'];
    const closeSpy = jest.spyOn(Subscription.prototype, 'close');

    for (let i = 0; i < 5; i++) {
      const channel = generateRandomChannelName();
      await pubsub.subscribe(channel, () => {}, {
        streamingPullOptions: {
          maxStreams: 1,
        },
      });
      expect(subscriptionMap.get(channel)).toBeDefined();
    }

    await pubsub.close();
    expect(closeSpy).toHaveBeenCalledTimes(5);
    /** Check that the pubsub object cannot be called anymore */
    await expect(pubsub.subscribe(generateRandomChannelName(), () => {})).rejects.toThrow(
      'Cannot use a closed PubSub object.',
    );
  });
});

describe('Tests related to the creation of Google resources', () => {
  let pubsub: PubSub;
  const defaultOptions: PubSubOptions = {
    autoCreate: true,
  };

  beforeAll(() => {
    pubsub = PubSubFactory.create({
      transport: Transport.GOOGLE_PUBSUB,
      options: defaultOptions,
    });
  });

  afterAll(async () => {
    await pubsub.close();
  });

  afterEach(async () => {
    await clearCache(pubsub);
    pubsub.setGlobalOptions(defaultOptions);
    jest.restoreAllMocks();
  });

  test('GPS100 - should create a topic and a subscription', async () => {
    const channel = generateRandomChannelName();
    const listener = (message: EmittedMessage) => console.log(message);

    await pubsub.subscribe(channel, listener);

    expect((pubsub as any).subscriptions.size).toEqual(1);
    expect((pubsub as any).subscriptions.get(channel)).toBeDefined();
    expect((pubsub as any).topics.size).toEqual(1);
    expect((pubsub as any).topics.get(channel)).toBeDefined();
  });

  test('GPS101 - should create a topic and a subscription with custom names', async () => {
    const customSubName = 'random_subscription_name';
    const topicName = 'my-topic';
    const listener = (message: EmittedMessage) => console.log(message);

    await pubsub.subscribe('channel-1', listener, {
      name: customSubName,
      topicName,
    });

    expect((pubsub as any).subscriptions.size).toEqual(1);
    expect((pubsub as any).subscriptions.get(customSubName)).toBeDefined();
    expect((pubsub as any).topics.size).toEqual(1);
    expect((pubsub as any).topics.get(topicName)).toBeDefined();
  });

  test('GPS102 - should use existing topic and subscription if it already exists', async () => {
    const nativeClient = pubsub.getNativeClient();
    const channel = generateRandomChannelName();
    const [topic] = await nativeClient.topic(channel).create();
    await topic.subscription(channel).create();

    const listener = (message: EmittedMessage) => console.log(message);

    await pubsub.subscribe(channel, listener);

    expect((pubsub as any).subscriptions.size).toEqual(1);
    expect((pubsub as any).subscriptions.get(channel)).toBeDefined();
    expect((pubsub as any).topics.size).toEqual(1);
    expect((pubsub as any).topics.get(channel)).toBeDefined();
  });

  test('GPS103 - should throw an error because topic and subscription are not linked', async () => {
    const nativeClient = pubsub.getNativeClient();
    const channel = generateRandomChannelName();
    /** Create two topics */
    const [firstTopic] = await nativeClient.topic(channel).create();
    const [secondTopic] = await nativeClient.topic('another_topic').create();
    /** Create a subscription with the same name as the first topic, but attach it to the second topic */
    const [subscription] = await secondTopic.subscription(channel).create();

    const listener = (message: EmittedMessage) => console.log(message);

    await expect(pubsub.subscribe(channel, listener)).rejects.toThrow(
      `[@algoan/pubsub] The topic ${firstTopic.name} is not attached to this subscription (expects topic ${subscription.metadata?.topic})`,
    );
  });

  test('GPS104 - should throw an error because the topic does not exist', async () => {
    pubsub.setGlobalOptions({ autoCreate: false });

    const channel = generateRandomChannelName();

    const listener = (message: EmittedMessage) => console.log(message);

    await expect(pubsub.subscribe(channel, listener)).rejects.toThrow(
      `[@algoan/pubsub] An error occurred when requesting topic ${channel}: 5 NOT_FOUND: Topic not found`,
    );
  });

  test('GPS105 - should throw an error because the subscription does not exist', async () => {
    const nativeClient = pubsub.getNativeClient();
    pubsub.setGlobalOptions({ autoCreate: false });

    const channel = generateRandomChannelName();
    const [topic] = await nativeClient.topic(channel).create();

    const listener = (message: EmittedMessage) => console.log(message);

    await expect(pubsub.subscribe(channel, listener)).rejects.toThrow(
      `[@algoan/pubsub] The subscription ${channel} is not found in topic ${topic.name}`,
    );
  });

  test('GPS106 - should throw an error because subscription is in push mode without endpoint', async () => {
    const channel = generateRandomChannelName();

    const listener = (message: EmittedMessage) => console.log(message);

    await expect(
      pubsub.subscribe(channel, listener, {
        mode: 'PUSH',
      }),
    ).rejects.toThrow('[algoan/pubsub] Cannot create a push subscription without endpoint defined');
  });

  test('GPS107 - should not set options to the topic', async () => {
    const options: PubSubOptions = {
      globalPublishOptions: {
        flowControlOptions: {
          maxMessages: 10,
          maxBytes: 1000,
        },
        retrySettings: {
          backoffSetting: {
            maxDelay: 100,
            startingDelay: 10,
            delayFirstAttempt: true,
          },
        },
        enableMessageOrdering: true,
      },
    };
    pubsub.setGlobalOptions(options);
    const channel = generateRandomChannelName();

    const listener = (message: EmittedMessage) => console.log(message);

    await pubsub.subscribe(channel, listener);

    expect((pubsub as any).subscriptions.size).toEqual(1);
    expect((pubsub as any).subscriptions.get(channel)).toBeDefined();
    expect((pubsub as any).topics.size).toEqual(1);
    expect((pubsub as any).topics.get(channel)).toBeDefined();
    const cachedTopic: Topic = (pubsub as any).topics.get(channel);
    expect(cachedTopic.publisher.flowControl.options.maxOutstandingBytes).not.toEqual(
      options.globalPublishOptions?.flowControlOptions?.maxBytes,
    );
    expect(cachedTopic.publisher.flowControl.options.maxOutstandingMessages).not.toEqual(
      options.globalPublishOptions?.flowControlOptions?.maxMessages,
    );
  });

  test('GPS108 - should set options to the topic', async () => {
    const options: PubSubOptions = {
      globalPublishOptions: {
        flowControlOptions: {
          maxMessages: 10,
          maxBytes: 1000,
        },
      },
    };
    pubsub.setGlobalOptions(options);
    const channel = generateRandomChannelName();

    await pubsub.publish(channel, {
      data: { hello: 'world' },
    });

    expect((pubsub as any).subscriptions.size).toEqual(0);
    expect((pubsub as any).topics.size).toEqual(1);
    expect((pubsub as any).topics.get(channel)).toBeDefined();
    const cachedTopic: Topic = (pubsub as any).topics.get(channel);
    expect(cachedTopic.publisher.flowControl.options.maxOutstandingBytes).toEqual(
      options.globalPublishOptions?.flowControlOptions?.maxBytes,
    );
    expect(cachedTopic.publisher.flowControl.options.maxOutstandingMessages).toEqual(
      options.globalPublishOptions?.flowControlOptions?.maxMessages,
    );
  });

  test('GPS109 - should set options to the topic through publish options arg', async () => {
    const options: PublishOptions = {
      flowControlOptions: {
        maxMessages: 10,
        maxBytes: 1000,
      },
    };
    const channel = generateRandomChannelName();

    await pubsub.publish(
      channel,
      {
        data: { hello: 'world' },
      },
      options,
    );

    expect((pubsub as any).subscriptions.size).toEqual(0);
    expect((pubsub as any).topics.size).toEqual(1);
    expect((pubsub as any).topics.get(channel)).toBeDefined();
    const cachedTopic: Topic = (pubsub as any).topics.get(channel);
    expect(cachedTopic.publisher.flowControl.options.maxOutstandingBytes).toEqual(options.flowControlOptions?.maxBytes);
    expect(cachedTopic.publisher.flowControl.options.maxOutstandingMessages).toEqual(
      options.flowControlOptions?.maxMessages,
    );
  });

  test('GPS110 - should set options to the topic and override global options', async () => {
    const options: PubSubOptions = {
      globalPublishOptions: {
        batchOptions: {
          maxBytes: 1000,
          maxMessages: 10,
          maxMs: 1000,
        },
        flowControlOptions: {
          maxMessages: 10,
          maxBytes: 1000,
        },
      },
    };
    pubsub.setGlobalOptions(options);
    const channel = generateRandomChannelName();

    await pubsub.publish(
      channel,
      {
        data: { hello: 'world' },
      },
      {
        flowControlOptions: {
          maxMessages: 20,
          maxBytes: 2000,
        },
      },
    );

    expect((pubsub as any).subscriptions.size).toEqual(0);
    expect((pubsub as any).topics.size).toEqual(1);
    expect((pubsub as any).topics.get(channel)).toBeDefined();
    const cachedTopic: Topic = (pubsub as any).topics.get(channel);
    expect(cachedTopic.publisher.flowControl.options.maxOutstandingBytes).toEqual(2000);
    expect(cachedTopic.publisher.flowControl.options.maxOutstandingMessages).toEqual(20);
    expect(cachedTopic.publisher.settings.batching?.maxBytes).toEqual(
      options.globalPublishOptions?.batchOptions?.maxBytes,
    );
    expect(cachedTopic.publisher.settings.batching?.maxMessages).toEqual(
      options.globalPublishOptions?.batchOptions?.maxMessages,
    );
    expect(cachedTopic.publisher.settings.batching?.maxMilliseconds).toEqual(
      options.globalPublishOptions?.batchOptions?.maxMs,
    );
  });

  test('GPS111 - should create a topic and a subscription and hit the cache', async () => {
    const channel = generateRandomChannelName();
    const listener = (message: EmittedMessage) => console.log(message);
    const topicMapSpy = jest.spyOn((pubsub as any).topics, 'get');
    const subscriptionMapSpy = jest.spyOn((pubsub as any).subscriptions, 'get');

    await pubsub.subscribe(channel, listener);

    expect((pubsub as any).subscriptions.size).toEqual(1);
    expect((pubsub as any).topics.size).toEqual(1);
    expect(topicMapSpy).toHaveBeenCalledTimes(1);
    expect(topicMapSpy).toHaveReturnedWith(undefined);
    expect(subscriptionMapSpy).toHaveBeenCalledTimes(1);
    expect(subscriptionMapSpy).toHaveReturnedWith(undefined);

    await pubsub.subscribe(channel, () => 'received');

    expect((pubsub as any).subscriptions.size).toEqual(1);
    expect((pubsub as any).topics.size).toEqual(1);
    expect(topicMapSpy).toHaveBeenCalledTimes(2);
    expect(topicMapSpy).toHaveReturnedWith((pubsub as any).topics.get(channel));
    expect(subscriptionMapSpy).toHaveBeenCalledTimes(2);
    expect(subscriptionMapSpy).toHaveReturnedWith((pubsub as any).subscriptions.get(channel));

    topicMapSpy.mockClear();
    subscriptionMapSpy.mockClear();
  });

  test('GPS112 - should use an existing topic', async () => {
    const nativeClient = pubsub.getNativeClient();
    const channel = generateRandomChannelName();
    await nativeClient.topic(channel).create();

    await pubsub.publish(channel, {
      data: { hello: 'world' },
    });

    expect((pubsub as any).subscriptions.size).toEqual(0);
    expect((pubsub as any).topics.size).toEqual(1);
    expect((pubsub as any).topics.get(channel)).toBeDefined();
  });

  test('GPS113 - should throw an error because topic does not exist', async () => {
    pubsub.setGlobalOptions({ autoCreate: false });

    const channel = generateRandomChannelName();

    await expect(pubsub.publish(channel, { data: { hello: 'world' } })).rejects.toThrow(
      `[@algoan/pubsub] An error occurred when requesting topic ${channel}: 5 NOT_FOUND: Topic not found`,
    );
  });

  test('GPS114 - should set all options for the subscription', async () => {
    const subscribeOptions: SubscribeOptions = {
      streamingPullOptions: {
        maxStreams: 1,
        timeout: 10000,
      },
      messageAckOptions: {
        autoAck: true,
        minDeadlineMs: 100,
        maxDeadlineMs: 10000,
        ackAfterListener: false,
        retainAckMessages: true,
        batchOptions: {
          maxMessages: 20,
        },
      },
      mode: 'STREAMING_PULL',
      exactlyOnceDelivery: false,
      enableMessageOrdering: false,
      expirationPolicy: {
        ttlHours: 1,
      },
      flowControl: {
        maxBytes: 1000,
        maxMessages: 10,
      },
    };
    pubsub.setGlobalOptions({
      globalSubscribeOptions: {
        prefix: 'sub%',
        retryPolicy: {
          backoffSettings: {
            maxDelay: 600,
            startingDelay: 10,
          },
        },
      },
    });

    const channel = generateRandomChannelName();
    const listener = (message: EmittedMessage) => console.log(message);

    await pubsub.subscribe(channel, listener, subscribeOptions);
    const cachedSubscription: Subscription = (pubsub as any).subscriptions.get(`sub%${channel}`);

    expect(cachedSubscription.name).toEqual(`projects/algoan-test/subscriptions/sub%${channel}`);
  });

  test('GPS115 - should add a prefix to all topics and the subscriptions', async () => {
    const channel = generateRandomChannelName();
    const secondChannel = generateRandomChannelName();
    pubsub.setGlobalOptions({
      topicsPrefix: 'test%',
      subscriptionsPrefix: 'my-app+',
    });
    const listener = (message: EmittedMessage) => console.log(message);

    await pubsub.subscribe(channel, listener);
    await pubsub.subscribe(secondChannel, listener);

    expect((pubsub as any).subscriptions.size).toEqual(2);
    (pubsub['subscriptions'] as Map<string, Subscription>).forEach((sub: Subscription, key: string) => {
      expect(sub.name).toEqual(`projects/algoan-test/subscriptions/${key}`);
    });
    (pubsub['topics'] as Map<string, Topic>).forEach((topic: Topic, key: string) => {
      expect(topic.name).toEqual(`projects/algoan-test/topics/${key}`);
    });
  });
});
