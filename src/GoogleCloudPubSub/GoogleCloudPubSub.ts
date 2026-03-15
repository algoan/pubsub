import {
  Attributes,
  ExistsResponse,
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
  DeadLetterOptions,
  GCListenOptions,
  GCPubSub,
  GCSubscriptionOptions,
  GooglePubSubOptions,
  SubscriptionMap,
  TopicMap,
} from './lib';

const defaultMaxDeliveryAttempts = 5;

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

  /**
   * Dead letter policy options applied when creating subscriptions
   */
  private readonly deadLetterOptions?: DeadLetterOptions;

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
    this.deadLetterOptions = options.deadLetterOptions;
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
        extendedMessage.ack();
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
   * Stop listening to a specific subscription. Close the server connection.
   * @param event Event name
   */
  public async unsubscribe(event: string): Promise<void> {
    const subscriptionName: string = this.getSubscriptionName(event);
    // Cover a case where there could be a custom subscription name with a prefix.
    const cachedSubscription: Subscription | undefined =
      this.subscriptions.get(subscriptionName) || this.subscriptions.get(event);

    if (cachedSubscription === undefined) {
      return;
    }

    return cachedSubscription.close();
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
    subOptions?: GCSubscriptionOptions,
  ): Promise<Subscription> {
    const options = {
      ...subOptions,
      get: { autoCreate: true, ...subOptions?.get },
    };
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

    if (!exists && !(options.get.autoCreate ?? false)) {
      /**
       * If autoCreate mode is disabled then do not create the subscription
       */
      throw new Error(`[@algoan/pubsub] The subscription ${subscriptionName} is not found in topic ${topic.name}`);
    }

    let subscription: Subscription;

    if (exists) {
      [subscription] = await sub.get(options?.get);
    } else {
      const deadLetterTopicName = await this.resolveDeadLetterTopicName(
        subscriptionName,
        subOptions?.deadLetterTopicName,
      );
      const deadLetterCreateOptions = this.buildDeadLetterCreateOptions(options.create, deadLetterTopicName);
      [subscription] = await sub.create(deadLetterCreateOptions);

      if (deadLetterTopicName !== undefined) {
        await this.setupDeadLetterIamPermissions(subscription, deadLetterTopicName);
      }
    }

    this.subscriptions.set(subscriptionName, subscription);

    return subscription;
  }

  /**
   * Resolves the dead-letter topic name for a new subscription using this priority:
   * 1. Per-subscription override (subOptions.deadLetterTopicName)
   * 2. Instance-level default (deadLetterOptions.deadLetterTopicName)
   * 3. Auto-derived: projects/<projectId>/<sanitizedSubscriptionName>-deadletter
   * (sanitized because subscription separators like '%' are invalid in topic names)
   * Returns undefined when deadLetterOptions is not configured on the instance.
   * Explicit names (cases 1 & 2) must be fully-qualified resource names.
   */
  private async resolveDeadLetterTopicName(
    subscriptionName: string,
    perSubscriptionOverride?: string,
  ): Promise<string | undefined> {
    if (this.deadLetterOptions === undefined) {
      return undefined;
    }

    const explicitName = perSubscriptionOverride ?? this.deadLetterOptions.deadLetterTopicName;
    const projectId = await this.client.auth.getProjectId();

    if (explicitName !== undefined) {
      const fullExplicitName = explicitName.startsWith('projects/')
        ? explicitName
        : `projects/${projectId}/topics/${explicitName}`;

      const shortExplicitName = fullExplicitName.split('/').pop() ?? fullExplicitName;

      await this.getOrCreateTopic(fullExplicitName);
      await this.getOrCreateDeadLetterDrainSubscription(fullExplicitName, `${shortExplicitName}-sub`);

      return fullExplicitName;
    }
    const sanitizedName = subscriptionName.replace(/[^a-zA-Z0-9\-_.~]/g, '-');
    const shortName = `${sanitizedName}-deadletter`;
    const fullTopicName = `projects/${projectId}/topics/${shortName}`;

    await this.getOrCreateTopic(fullTopicName);
    await this.getOrCreateDeadLetterDrainSubscription(fullTopicName, `${shortName}-sub`);

    return fullTopicName;
  }

  /**
   * Ensures a drain subscription exists on the dead-letter topic so that
   * GCP does not discard dead-lettered messages.
   */
  private async getOrCreateDeadLetterDrainSubscription(dltTopicName: string, drainSubName: string): Promise<void> {
    const drainSub = this.client.topic(dltTopicName).subscription(drainSubName);
    const [exists] = await drainSub.exists();

    if (!exists) {
      await drainSub.create();
      this.logger.debug({ dltTopicName, drainSubName }, 'Created drain subscription on dead-letter topic');
    }
  }

  /**
   * Merges dead letter policy into CreateSubscriptionOptions if deadLetterOptions is configured
   */
  private buildDeadLetterCreateOptions(
    createOptions?: GCSubscriptionOptions['create'],
    resolvedDeadLetterTopicName?: string,
  ): GCSubscriptionOptions['create'] {
    if (this.deadLetterOptions === undefined || resolvedDeadLetterTopicName === undefined) {
      return createOptions;
    }

    return {
      ...createOptions,
      deadLetterPolicy: {
        deadLetterTopic: resolvedDeadLetterTopicName,
        maxDeliveryAttempts: this.deadLetterOptions.maxDeliveryAttempts ?? defaultMaxDeliveryAttempts,
      },
    };
  }

  /**
   * Grants the required IAM permissions for dead-letter forwarding.
   * Pub/Sub service account needs:
   * - roles/pubsub.publisher on the dead-letter topic
   * - roles/pubsub.subscriber on the source subscription
   */
  private async setupDeadLetterIamPermissions(subscription: Subscription, deadLetterTopicName: string): Promise<void> {
    const projectId: string = await this.client.auth.getProjectId();
    const projectNumber = await this.getProjectNumber(projectId);
    const serviceAccount = `serviceAccount:service-${projectNumber}@gcp-sa-pubsub.iam.gserviceaccount.com`;

    const deadLetterTopic: Topic = this.client.topic(deadLetterTopicName);

    const [topicPolicy] = await deadLetterTopic.iam.getPolicy();
    const topicBindings = topicPolicy.bindings ?? [];
    const topicAlreadyBound = topicBindings.some(
      (b) => b.role === 'roles/pubsub.publisher' && b.members?.includes(serviceAccount),
    );

    if (!topicAlreadyBound) {
      const updatedTopicPolicy = {
        ...topicPolicy,
        bindings: [...topicBindings, { role: 'roles/pubsub.publisher', members: [serviceAccount] }],
      };
      await deadLetterTopic.iam.setPolicy(updatedTopicPolicy);
    }

    const [subPolicy] = await subscription.iam.getPolicy();
    const updatedSubPolicy = {
      ...subPolicy,
      bindings: [...(subPolicy.bindings ?? []), { role: 'roles/pubsub.subscriber', members: [serviceAccount] }],
    };
    await subscription.iam.setPolicy(updatedSubPolicy);

    this.logger.debug({ deadLetterTopicName, serviceAccount }, 'Dead-letter IAM permissions granted');
  }

  /**
   * Resolves the numeric GCP project number for a given project ID.
   * Uses the Cloud Resource Manager REST API v1 where projectNumber is an explicit top-level field.
   */
  private async getProjectNumber(projectId: string): Promise<string> {
    const url = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`;
    const response = await this.client.auth.request<{ projectNumber: string }>({ url });

    return response.data.projectNumber;
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
