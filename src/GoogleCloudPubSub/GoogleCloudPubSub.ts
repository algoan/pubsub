import {
  Attributes,
  GetSubscriptionOptions,
  GetSubscriptionResponse,
  GetTopicOptions,
  GetTopicResponse,
  Message,
  PubSub as GPubSub,
  Subscription,
  Topic,
} from '@google-cloud/pubsub';
import * as Pino from 'pino';

import { PubSub } from '../PubSub';
import { ExtendedMessage, ExtendedPayload } from './ExtendedMessage';
import { EmitOptions, GooglePubSubOptions, ListenOptions, SubscriptionMap, TopicMap } from './lib';

/**
 * Google PubSub SDK
 */
export class GoogleCloudPubSub implements PubSub {
  /**
   * Google cloud pubsub Client
   */
  public client: GPubSub;

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
   * Cached topics of the emitter
   */
  private readonly subscriptions: SubscriptionMap;

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
   * @param options Options related to the listen method
   */
  public async listen<T>(event: string, options: ListenOptions<T> = { autoAck: true }): Promise<void> {
    const topic: Topic = await this.getOrCreateTopic(event, options.topicOptions);
    const subscription: Subscription = await this.getOrCreateSubscription(event, topic, options.subscriptionOptions);
    this.logger.debug(
      {
        options,
      },
      `Listened to topic ${topic.name} with subscription ${subscription.name}`,
    );

    subscription.on('message', (message: Message): void => {
      const extendedMessage: ExtendedMessage<T> = new ExtendedMessage<T>(message);

      this.logger.debug(
        {
          parsedData: extendedMessage.parsedData,
        },
        `A message has been received for Subscription ${subscription.name} after ${
          message.received - message.publishTime.valueOf()
        } ms`,
      );

      if (options.autoAck === true) {
        message.ack();
      }

      if (options.onMessage !== undefined) {
        options.onMessage(extendedMessage);
      }
    });

    subscription.on('error', (error: Error): void => {
      this.logger.error(error, `An error occurred when listening to subscription ${subscription.name}`);

      if (options.onError !== undefined) {
        options.onError(error);
      }
    });
  }

  /**
   * Emit an event using the Google PubSub publish JSON method
   * @tutorial https://cloud.google.com/pubsub/docs/publisher
   * @param event Event name to publish
   * @param payload Payload to share
   * @param options Emit options
   */
  public async emit<T>(event: string, data: T, options: EmitOptions = {}): Promise<string> {
    const topic: Topic = await this.getOrCreateTopic(event, options.topicOptions);
    this.logger.debug(
      {
        data,
        options,
      },
      `Found topic ${topic.name} for event ${event}`,
    );

    const attributes: Attributes = {};
    const payload: ExtendedPayload<T> = {
      _eventName: event,
      time: Date.now(),
      ...data,
    };

    if (this.namespace !== undefined) {
      attributes.namespace = this.namespace;
    }

    if (this.environment !== undefined) {
      attributes.environment = this.environment;
    }

    this.logger.debug(
      {
        payload,
        attributes,
        options,
      },
      `Sending payload to Topic ${topic.name}`,
    );

    return topic.publishJSON(payload, { ...attributes, ...options.customAttributes });
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
    options?: GetSubscriptionOptions,
  ): Promise<Subscription> {
    const subscriptionName: string = this.getSubscriptionName(name);
    const cachedSubscription: Subscription | undefined = this.subscriptions.get(subscriptionName);

    if (cachedSubscription !== undefined) {
      return cachedSubscription;
    }

    const [subscription]: GetSubscriptionResponse = await topic
      .subscription(subscriptionName)
      .get({ autoCreate: true, ...options });
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
