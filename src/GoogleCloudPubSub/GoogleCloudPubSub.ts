import {
  Attributes,
  GetSubscriptionResponse,
  GetTopicOptions,
  GetTopicResponse,
  Message,
  PubSub as GPubSub,
  Subscription,
  Topic,
} from '@google-cloud/pubsub';
import * as Pino from 'pino';

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
   * Topic prefix
   * Example: if "topicsPrefix = algoan",
   * then topic names will begin with "algoan+"
   */
  private readonly topicsPrefix?: string;

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
  private readonly logger: Pino.Logger;

  constructor(options: GooglePubSubOptions = {}) {
    this.client = new GPubSub(options);
    this.subscriptionsPrefix = options.subscriptionsPrefix;
    this.topicsPrefix = options.topicsPrefix;
    this.namespace = options.namespace;
    this.environment = options.environment;
    this.topics = new Map();
    this.subscriptions = new Map();
    this.logger = Pino({
      prettyPrint: process.env.NODE_ENV !== 'production',
      level: options.debug === true ? 'debug' : 'silent',
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
    const topic: Topic = await this.getOrCreateTopic(event, opts.options?.topicOptions);
    const subscription: Subscription = await this.getOrCreateSubscription(
      event,
      topic,
      opts.options?.subscriptionOptions,
    );
    this.logger.debug(
      {
        options: opts,
      },
      `Listened to topic ${topic.name} with subscription ${subscription.name}`,
    );

    subscription.on('message', (message: Message): void => {
      const extendedMessage: ExtendedMessage<T> = new ExtendedMessage<T>(message);

      this.logger.debug(
        extendedMessage,
        `A message has been received for Subscription ${subscription.name} after ${
          message.received - message.publishTime.valueOf()
        } ms`,
      );

      if (opts.options?.autoAck === true) {
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
  public async emit(event: string, data: object, opts: EmitOptions<GCListenOptions> = {}): Promise<string> {
    const topic: Topic = await this.getOrCreateTopic(event, opts.options?.topicOptions);
    this.logger.debug(
      {
        data,
        options: opts,
      },
      `Found topic ${topic.name} for event ${event}`,
    );

    const attributes: Attributes = {};

    if (this.namespace !== undefined) {
      attributes.namespace = this.namespace;
    }

    if (this.environment !== undefined) {
      attributes.environment = this.environment;
    }

    this.logger.debug(
      {
        data,
        attributes,
        options: opts,
      },
      `Sending payload to Topic ${topic.name}`,
    );

    return topic.publishJSON(data, { ...attributes, ...opts.metadata });
  }

  /**
   * Get or create a topic on Google PubSub
   * Also fill the topic map in-memory cache
   * @tutorial https://github.com/googleapis/nodejs-pubsub/blob/master/samples/createTopic.js
   * @param name Name of the topic
   */
  private async getOrCreateTopic(name: string, options?: GetTopicOptions): Promise<Topic> {
    const topicName: string = this.getTopicName(name);
    const cachedTopic: Topic | undefined = this.topics.get(topicName);

    if (cachedTopic !== undefined) {
      return cachedTopic;
    }

    const [topic]: GetTopicResponse = await this.client.topic(topicName).get({ autoCreate: true, ...options });
    this.topics.set(topicName, topic);

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
    const subscriptionName: string = this.getSubscriptionName(name);
    const cachedSubscription: Subscription | undefined = this.subscriptions.get(subscriptionName);

    if (cachedSubscription !== undefined) {
      return cachedSubscription;
    }

    const [subscription]: GetSubscriptionResponse = await topic
      .subscription(subscriptionName, options?.sub)
      .get({ autoCreate: true, ...options?.get });
    this.subscriptions.set(subscriptionName, subscription);

    return subscription;
  }

  /**
   * Add a topic prefix to the event if it is defined
   * @param event Event name emitted
   */
  private getTopicName(event: string): string {
    if (this.topicsPrefix !== undefined) {
      return `${this.topicsPrefix}+${event}`;
    }

    return event;
  }

  /**
   * Add a topic prefix to the event if it is defined
   * @param event Event name emitted
   */
  private getSubscriptionName(event: string): string {
    if (this.subscriptionsPrefix !== undefined) {
      return `${this.subscriptionsPrefix}%${event}`;
    }

    return event;
  }
}
