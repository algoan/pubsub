import {
  Duration,
  ExistsResponse,
  GetTopicOptions,
  Message,
  PubSub as GPubSub,
  Subscription,
  Topic,
  PublishOptions as GPublishOptions,
} from '@google-cloud/pubsub';

import { EmittedMessage } from '..';
import { PubSubOptions, PublishOptions, PublishPayload, SubscribeOptions } from '../lib';
import { PubSub } from '../PubSub';

import { GooglePubSubMessage } from './GooglePubSubMessage';
import { SubscriptionMap, TopicMap } from './lib';

const nbHourPerDay = 24;
const nbMinPerHour = 60;
const nbSecPerMin = 60;
const nbMsPerSec = 1000;

/**
 * Google PubSub SDK
 */
export class GoogleCloudPubSub extends PubSub {
  /**
   * Native Google cloud pubsub Client
   */
  private readonly client: GPubSub;

  /**
   * Cached subscriptions of the emitter
   */
  private readonly subscriptions: SubscriptionMap;

  /**
   * Cached topics of the emitter
   */
  private readonly topics: TopicMap;

  constructor(options?: PubSubOptions) {
    super(options);
    this.client = new GPubSub({
      port: options?.port,
    });
    this.subscriptions = new Map();
    this.topics = new Map();
  }

  /**
   * Get the Google PubSub native client
   */
  public getNativeClient(): GPubSub {
    return this.client;
  }

  /**
   * Subscribe to a channel and listen to messages
   * @param channel
   * @param listener
   * @param options
   */
  public async subscribe(
    channel: string,
    listener: (message: EmittedMessage) => Promise<void> | void,
    options?: SubscribeOptions,
  ): Promise<void> {
    /**
     * Get or create topics
     */
    const topicName = options?.topicName ?? this.getTopicName(channel);
    const topic = await this.getOrCreateTopic(topicName);
    /**
     * Get or create the attached subscription
     */
    const subOptions: SubscribeOptions = this.getSubscribeOptions(options);
    const subscriptionName = options?.name ?? this.getSubscriptionName(channel, subOptions.prefix);
    const subscription = await this.getOrCreateSubscription(subscriptionName, topic, subOptions);

    switch (subOptions.mode) {
      case 'PULL':
        break;
      case 'PUSH':
        break;
      default:
        GoogleCloudPubSub.stream(subscription, listener, subOptions);
        break;
    }

    return;
  }

  /**
   * Stop listening to a specific channel
   * @param channel
   * @param options
   */
  public async unsubscribe(subscriptionName: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionName);

    await subscription?.close();
  }

  /**
   * Publish a message or a batch of messages to the channel
   * @param channel Publication channel
   * @param payload Data to send
   * @param options Options related to the publish method
   */
  public async publish(
    channel: string,
    payload: PublishPayload | PublishPayload[],
    options?: PublishOptions,
  ): Promise<void> {
    /**
     * Get or create topics
     */
    const topicName = options?.topicName ?? this.getTopicName(channel);
    const pubOptions = this.getPublishOptions(options);
    const topic = await this.getOrCreateTopic(topicName, pubOptions);

    if (!(payload instanceof Array)) {
      await topic.publishMessage({
        json: payload.data,
        attributes: {
          ...this.options?.metadata,
          ...payload.attributes,
        },
        orderingKey: payload.orderingKey,
      });

      return;
    }

    const promises: Promise<string>[] = [];

    for (const individualPayload of payload) {
      promises.push(
        topic.publishMessage({
          json: individualPayload.data,
          attributes: {
            ...this.options?.metadata,
            ...individualPayload.attributes,
          },
          orderingKey: individualPayload.orderingKey,
        }),
      );
    }

    await Promise.all(promises);
  }

  /**
   * Close all connections
   */
  public async close(): Promise<void> {
    const promises: Promise<void>[] = [];
    this.subscriptions.forEach((sub: Subscription) => {
      if (sub.isOpen) {
        promises.push(sub.close());
      }
    });
    await Promise.all(promises);
    if (this.client.isOpen) {
      await this.client.close();
    }
  }

  /**
   * Streaming pull subscription. Establishes a HTTP/2 connection with gRPC and return a stream.
   * @param subscription Google subscription object
   * @param listener Method to apply when receiving a message. Can be an async function.
   * @param options Subscribe options
   */
  private static stream(
    subscription: Subscription,
    listener: (message: EmittedMessage) => Promise<void> | void,
    options: SubscribeOptions,
  ): void {
    const isAutoAckEnabled = options.messageAckOptions?.autoAck ?? false;
    const ackAfterListener = options.messageAckOptions?.ackAfterListener ?? false;
    const onError = options.onError;
    const onClose = options.onClose;

    subscription.on('message', async (message: Message) => {
      const extendedMessage: GooglePubSubMessage = new GooglePubSubMessage(message);

      if (isAutoAckEnabled && !ackAfterListener) {
        await extendedMessage.ack();
      }

      try {
        await listener(extendedMessage);
      } catch (err) {
        if (options.messageAckOptions?.nackIfError === true) {
          return extendedMessage.nack();
        }
      }

      if (isAutoAckEnabled && ackAfterListener) {
        await extendedMessage.ack();
      }
    });

    subscription.on(
      'error',
      onError !== undefined
        ? onError
        : (error: Error) => {
            // eslint-disable-next-line no-console
            console.error(`An error occurred: ${error}`);
          },
    );

    if (onClose !== undefined) {
      subscription.on('close', onClose);
    }
  }

  /**
   * Get or create a topic on Google PubSub
   * Also fill the topic map in-memory cache
   * @tutorial https://github.com/googleapis/nodejs-pubsub/blob/master/samples/createTopic.js
   * @param name Name of the topic
   * @param publishOptions Options related to the publish method, applied to the topic
   */
  private async getOrCreateTopic(name: string, publishOptions?: PublishOptions): Promise<Topic> {
    let topic: Topic | undefined = this.topics.get(name);

    const topicOptions: GetTopicOptions = {
      autoCreate: this.options?.autoCreate,
    };

    if (topic === undefined) {
      try {
        const topicResponse = await this.client.topic(name).get(topicOptions);
        topic = topicResponse[0];
      } catch (err: unknown) {
        throw new Error(
          `[@algoan/pubsub] An error occurred when requesting topic ${name}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    if (publishOptions !== undefined && Object.keys(publishOptions).length > 0) {
      const googlePublishOptions: GPublishOptions = {
        batching: {
          maxMilliseconds: publishOptions.batchOptions?.maxMs,
          ...publishOptions.batchOptions,
        },
        flowControlOptions: {
          maxOutstandingBytes: publishOptions.flowControlOptions?.maxBytes,
          maxOutstandingMessages: publishOptions.flowControlOptions?.maxMessages,
        },
        messageOrdering: publishOptions.enableMessageOrdering,
      };

      topic.setPublishOptions(googlePublishOptions);
    }

    this.topics.set(name, topic);

    return topic;
  }

  /**
   * Get specific or global publish options. Priority to the specific one
   * @param publishOptions Specific publish options
   * @returns The correct publish option object
   */
  private getPublishOptions(publishOptions?: PublishOptions): PublishOptions {
    return { ...this.options?.globalPublishOptions, ...publishOptions };
  }

  /**
   * Get specific or global subscribe options. Priority to the specific one
   * @param subscribeOptions Specific subscribe options
   * @returns The correct publish option object
   */
  private getSubscribeOptions(subscribeOptions?: SubscribeOptions): SubscribeOptions {
    return { ...this.options?.globalSubscribeOptions, ...subscribeOptions };
  }

  /**
   * Get or create a subscription on GooglePubSub
   * @tutorial https://github.com/googleapis/nodejs-pubsub/blob/master/samples/getSubscription.js
   * Also fill the subscription in-memory cache
   * @param name Name of the subscription
   * @param topic Topic attached to this subscription
   */
  private async getOrCreateSubscription(
    name: string,
    topic: Topic,
    subscribeOptions: SubscribeOptions,
  ): Promise<Subscription> {
    const cachedSubscription: Subscription | undefined = this.subscriptions.get(name);

    if (cachedSubscription !== undefined) {
      return cachedSubscription;
    }

    const sub: Subscription = topic.subscription(name, {
      flowControl: {
        maxBytes: subscribeOptions.flowControl?.maxBytes,
        maxMessages: subscribeOptions.flowControl?.maxMessages,
      },
      streamingOptions: { ...subscribeOptions.streamingPullOptions },
      batching: {
        maxMessages: subscribeOptions.messageAckOptions?.batchOptions?.maxMessages,
        maxMilliseconds: subscribeOptions.messageAckOptions?.batchOptions?.maxMs,
      },
      minAckDeadline:
        subscribeOptions.messageAckOptions?.minDeadlineMs !== undefined
          ? Duration.from({ millis: subscribeOptions?.messageAckOptions?.minDeadlineMs })
          : undefined,
      maxAckDeadline:
        subscribeOptions.messageAckOptions?.minDeadlineMs !== undefined
          ? Duration.from({ millis: subscribeOptions?.messageAckOptions?.maxDeadlineMs })
          : undefined,
    });
    const [exists]: ExistsResponse = await sub.exists();
    const shouldAutoCreate = this.options?.autoCreate ?? false;
    /**
     * If autoCreate mode is disabled, check if the subscription is attached to the topic
     */
    if (exists && sub.metadata?.topic !== undefined && sub.metadata.topic !== topic.name) {
      throw new Error(
        `[@algoan/pubsub] The topic ${topic.name} is not attached to this subscription (expects topic ${sub.metadata.topic})`,
      );
    }

    if (!exists && !shouldAutoCreate) {
      /**
       * If autoCreate mode is disabled then do not create the subscription
       */
      throw new Error(`[@algoan/pubsub] The subscription ${name} is not found in topic ${topic.name}`);
    }

    /**
     * Cannot set a push subscription without an endpoint
     */
    if (subscribeOptions.mode === 'PUSH' && subscribeOptions.pushOptions?.endpoint === undefined) {
      throw new Error('[algoan/pubsub] Cannot create a push subscription without endpoint defined');
    }

    const [subscription] = exists
      ? await sub.get()
      : await sub.create({
          messageRetentionDuration: subscribeOptions.messageRetentionDuration,
          pushEndpoint: subscribeOptions.pushOptions?.endpoint,
          enableExactlyOnceDelivery: subscribeOptions.exactlyOnceDelivery,
          enableMessageOrdering: subscribeOptions.enableMessageOrdering,
          ackDeadlineSeconds:
            subscribeOptions.messageAckOptions?.minDeadlineMs !== undefined
              ? subscribeOptions.messageAckOptions.minDeadlineMs / nbMsPerSec
              : undefined,
          retainAckedMessages: subscribeOptions.messageAckOptions?.retainAckMessages,
          expirationPolicy: {
            ttl: {
              seconds:
                subscribeOptions.expirationPolicy?.ttlHours !== undefined
                  ? subscribeOptions.expirationPolicy.ttlHours * nbHourPerDay * nbMinPerHour * nbSecPerMin
                  : undefined,
            },
          },
          filter: subscribeOptions.filter,
          deadLetterPolicy:
            subscribeOptions.deadLetterPolicy !== undefined
              ? {
                  deadLetterTopic: subscribeOptions.deadLetterPolicy.channel,
                  maxDeliveryAttempts: subscribeOptions.deadLetterPolicy.maxDeliveryAttempts,
                }
              : undefined,
          retryPolicy: {
            maximumBackoff: {
              seconds: subscribeOptions.retryPolicy?.backoffSettings?.maxDelay,
            },
            minimumBackoff: {
              seconds: subscribeOptions.retryPolicy?.backoffSettings?.startingDelay,
            },
          },
        });

    this.subscriptions.set(name, subscription);

    return subscription;
  }
}
