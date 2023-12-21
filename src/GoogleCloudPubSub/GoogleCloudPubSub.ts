import {
  Attributes,
  CreateSubscriptionResponse,
  ExistsResponse,
  GetSubscriptionResponse,
  GetTopicOptions,
  GetTopicResponse,
  Message,
  PubSub as GPubSub,
  Subscription,
  Topic,
  PublishOptions,
} from '@google-cloud/pubsub';
import { pino } from 'pino';

import { EmitOptions, ListenOptions } from '..';
import { ExtendedMessage } from './ExtendedMessage';
import {
  GCListenOptions,
  GCPubSub,
  GCSubscriptionOptions,
  GooglePubSubOptions,
  SubscriptionMap,
  TopicMap,
} from './lib';

/**
 * Google PubSub SDK
 */
export class GoogleCloudPubSub implements GCPubSub {
  /**
   * Google cloud pubsub Client
   */
  public client: GPubSub;

  /**
   * Cached topics of the emitter
   */
  public readonly subscriptions: SubscriptionMap;

  /**
   * Subscription prefix
   * Example: if "subscriptionPrefix = app",
   * then subscription names will begin with "app%"
   */
  private readonly subscriptionsPrefix?: string;

  /**
   * Subscription separator
   * Example: if "subscriptionSeparator = -",
   * then subscription name will begin with "<subscriptionPrefix>-"
   *
   * @defaultValue `%`
   */
  private readonly subscriptionsSeparator?: string;

  /**
   * Topic prefix
   * Example: if "topicsPrefix = algoan",
   * then topic names will begin with "algoan+"
   */
  private readonly topicsPrefix?: string;

  /**
   * Topic separator
   * Example: if "topicsSeparator = -",
   * then topic names will begin with "<topicsPrefix>-"
   *
   * @defaultValue '+'
   */
  private readonly topicsSeparator?: string;

  /**
   * An optional namespace
   * Can be useful when emitting an event
   */
  private readonly namespace?: string;

  /**
   * Optional environment
   * Can be useful to differentiate development from production
   */
  private readonly environment?: string;

  /**
   * Cached topics of the emitter
   */
  private readonly topics: TopicMap;

  /**
   * Logger
   */
  private readonly logger: pino.Logger;

  constructor(options: GooglePubSubOptions = {}) {
    this.client = new GPubSub(options);
    this.subscriptionsPrefix = options.subscriptionsPrefix;
    this.subscriptionsSeparator = options.subscriptionsSeparator !== undefined ? options.subscriptionsSeparator : '%';
    this.topicsPrefix = options.topicsPrefix;
    this.topicsSeparator = options.topicsSeparator !== undefined ? options.topicsSeparator : '+';
    this.namespace = options.namespace;
    this.environment = options.environment;
    this.topics = new Map();
    this.subscriptions = new Map();
    this.logger = pino({
      level: options.debug === true ? 'debug' : 'silent',
      ...options.pinoOptions,
    });
  }

  /**
   * Listen to a Google PubSub subscription
   * Only pull method
   * @tutorial https://cloud.google.com/pubsub/docs/pull
   * @param event Event to subscribe to
   * @param opts Options related to the listen method
   */
  public async listen<T>(
    event: string,
    opts: ListenOptions<T, GCListenOptions> = { options: { autoAck: true } },
  ): Promise<void> {
    const topicName: string = opts?.options?.topicName ?? this.getTopicName(event);
    const topic: Topic = await this.getOrCreateTopic(topicName, opts.options?.topicOptions);
    const subscription: Subscription = await this.getOrCreateSubscription(
      event,
      topic,
      opts.options?.subscriptionOptions,
    );
    this.logger.debug(`Listened to topic ${topic.name} with subscription ${subscription.name}`);

    subscription.on('message', (message: Message): void => {
      const extendedMessage: ExtendedMessage<T> = new ExtendedMessage<T>(message);

      this.logger.debug(
        { ...extendedMessage, payload: undefined, originalMessage: undefined },
        `A message has been received for Subscription ${subscription.name} after ${
          message.received - message.publishTime.valueOf()
        } ms`,
      );

      if (opts.options?.autoAck !== false) {
        message.ack();
      }

      if (opts.onMessage !== undefined) {
        opts.onMessage(extendedMessage);
      }
    });

    subscription.on('error', (error: Error): void => {
      this.logger.error(error, `An error occurred when listening to subscription ${subscription.name}`);

      if (opts.onError !== undefined) {
        opts.onError(error);
      }
    });
  }

  /**
   * Emit an event using the Google PubSub publish JSON method
   * @tutorial https://cloud.google.com/pubsub/docs/publisher
   * @param event Event name to publish
   * @param payload Payload to share
   * @param opts Emit options
   */
  public async emit(
    event: string,
    data: Record<string, unknown>,
    opts: EmitOptions<GCListenOptions> = {},
  ): Promise<string> {
    const topic: Topic = await this.getOrCreateTopic(
      this.getTopicName(event),
      opts.options?.topicOptions,
      opts.options?.publishOptions,
    );
    this.logger.debug(`Found topic ${topic.name} for event ${event}`);

    const attributes: Attributes = { ...opts.options?.messageOptions?.attributes };

    if (this.namespace !== undefined) {
      attributes.namespace = this.namespace;
    }

    if (this.environment !== undefined) {
      attributes.environment = this.environment;
    }

    this.logger.debug(
      {
        attributes,
      },
      `Sending payload to Topic ${topic.name}`,
    );

    return topic.publishMessage({
      json: data,
      attributes: { ...attributes, ...opts.metadata },
      ...opts.options?.messageOptions,
    });
  }

  /**
   * Get or create a topic on Google PubSub
   * Also fill the topic map in-memory cache
   * @tutorial https://github.com/googleapis/nodejs-pubsub/blob/master/samples/createTopic.js
   * @param name Name of the topic
   */
  private async getOrCreateTopic(
    name: string,
    getTopicOptions?: GetTopicOptions,
    publishOptions?: PublishOptions,
  ): Promise<Topic> {
    const cachedTopic: Topic | undefined = this.topics.get(name);
    const topicOptions = { autoCreate: true, ...getTopicOptions };

    if (cachedTopic !== undefined) {
      return cachedTopic;
    }

    const [topic]: GetTopicResponse = await this.client.topic(name).get(topicOptions);

    if (publishOptions) {
      topic.setPublishOptions(publishOptions);
    }

    this.topics.set(name, topic);

    return topic;
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
    options?: GCSubscriptionOptions,
  ): Promise<Subscription> {
    const subscriptionName: string = options?.name ?? this.getSubscriptionName(name);
    const cachedSubscription: Subscription | undefined = this.subscriptions.get(subscriptionName);

    if (cachedSubscription !== undefined) {
      return cachedSubscription;
    }

    const sub: Subscription = topic.subscription(subscriptionName, options?.sub);
    const [exists]: ExistsResponse = await sub.exists();

    /**
     * If autoCreate mode is disabled, check if the subscription is attached to the topic
     */
    if (exists && sub.metadata?.topic !== undefined && sub.metadata.topic !== topic.name) {
      throw new Error(
        `[@algoan/pubsub] The topic ${topic.name} is not attached to this subscription (expects topic ${sub.metadata.topic})`,
      );
    }

    const [subscription]: GetSubscriptionResponse | CreateSubscriptionResponse = exists
      ? await sub.get(options?.get)
      : await sub.create(options?.create);

    this.subscriptions.set(subscriptionName, subscription);

    return subscription;
  }

  /**
   * Add a topic prefix to the event if it is defined
   * @param event Event name emitted
   */
  private getTopicName(event: string): string {
    if (this.topicsPrefix !== undefined) {
      return `${this.topicsPrefix}${this.topicsSeparator}${event}`;
    }

    return event;
  }

  /**
   * Add a topic prefix to the event if it is defined
   * @param event Event name emitted
   */
  private getSubscriptionName(event: string): string {
    if (this.subscriptionsPrefix !== undefined) {
      return `${this.subscriptionsPrefix}${this.subscriptionsSeparator}${event}`;
    }

    return event;
  }
}
