import { BackoffOptions } from 'exponential-backoff';

/**
 * Object with any properties (default to any)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AnyProperties<T = any> {
  [key: string]: T;
}

interface Authentication {}

/**
 * Options related to the subscribe method
 *
 * @interface SubscribeOptions
 */
export interface SubscribeOptions {
  /** Name of the subscription if you've disabled the autoCreate mode */
  name?: string;
  /** Name of the topic if you've disabled the autoCreate mode */
  topicName?: string;
  /** Trigger this function when an error is thrown */
  onError?(this: void, err: unknown): void;
  /** Trigger this function when the connection is closed with the server */
  onClose?(this: void): void;
  /** If you've chosen the "STREAMING_PULL" mode, set options on streams */
  streamingPullOptions?: {
    /** Max number of streams (default to 5) */
    maxStreams?: number;
    /** Stream connection timeout (default to 30 min) */
    timeout?: number;
    /** Node streams high water mark to handle backpressure (default to 16 kB) */
    highWaterMark?: number;
  };
  /** If you've chosen the PULL mode, set options on messages retrieval  */
  pullOptions?: {
    /** Maximum messages per batch */
    maxMessages?: number;
    /** Set an interval to regularly retrieve messages */
    setInterval?: number;
  };
  /** If you have chosen the PUSH mode, set options specific to this mode */
  pushOptions?: {
    /** @required Push subscription Endpoint  */
    endpoint: string;
    /** Set to true if you want the message data to be directly delivered as the HTTP body response without metadata */
    enablePayloadUnwrapping?: boolean;
    /** Request Authorization header */
    authorizationConfig?: {
      /** Authorization JWT */
      oidcJWT?: string;
    };
  };
  /** Options related to the message acknowledgment */
  messageAckOptions?: {
    /** Minimum delay to set for the ack deadline (in milliseconds) */
    minDeadlineMs?: number;
    /** Maximum delay to set for the ack deadline (in milliseconds) */
    maxDeadlineMs?: number;
    /** Set to true if you want this library to call message ack */
    autoAck?: boolean;
    /** Set to true if you want this library to ack the message after the listener has been successfully called */
    ackAfterListener?: boolean;
    /** Set to true if you want this library to nack the message if the listener throws an error */
    nackIfError?: boolean;
    /** Set to true if you want to save ack messages */
    retainAckMessages?: boolean;
    /** Control ack requests batch */
    batchOptions?: BatchOptions;
  };
  /**
   * Set the subscription mode:
   * - STREAMING_PULL: a long polling connection is opened between the client and the pubsub server
   * - PULL: a short polling is done to retrieve messages
   * - PUSH: the subscription calls a specific endpoint
   */
  mode?: 'STREAMING_PULL' | 'PULL' | 'PUSH';
  /** Set a prefix to the subscription. Overrides the global prefix */
  prefix?: string;
  /** Control incoming message flows to avoid overwhelming your app */
  flowControl?: {
    /** Max message to handle before pausing the listening process */
    maxMessages?: number;
    /** Max memory value to handle before pausing the listening process */
    maxBytes?: number;
  };
  /** Set to true if you want to enable the exactly once delivery mode */
  exactlyOnceDelivery?: boolean;
  /** Set to true if the subscription enables message ordering */
  enableMessageOrdering?: boolean;
  /** Retry policy settings */
  retryPolicy?: {
    /**
     * Exponential backoff settings
     * @link https://github.com/coveooss/exponential-backoff
     */
    backoffSettings?: BackoffOptions;
  };
  /** Filters messages by attributes */
  filter?: string;
  /** Set the duration of the message retention */
  messageRetentionDuration?: number;
  /** Option related to the dead letter queue */
  deadLetterPolicy?: {
    /** Name of the channel */
    channel?: string;
    /** Max number of delivery attempts */
    maxDeliveryAttempts?: number;
  };
  /** Options related to the subscription expiration policy */
  expirationPolicy?: {
    /** TTL to set for the subscription in hours */
    ttlHours?: number;
  };
}

/**
 * Batch Options
 */
interface BatchOptions {
  /** Max messages to store in the internal queue */
  maxMessages?: number;
  /** Max memory allowed in the internal queue */
  maxBytes?: number;
  /** Max duration before sending the batch of requests */
  maxMs?: number;
}
/**
 * Options related to the publish method
 */
export interface PublishOptions {
  /** Name of the topic (useful if it is already created) */
  topicName?: string;
  /** Enable the message ordering option */
  enableMessageOrdering?: boolean;
  /** Retry settings for the publish method */
  retrySettings?: {
    /** Back off settings to retry publish */
    backoffSetting?: BackoffOptions;
  };
  /** Control the number of messages or max memory */
  flowControlOptions?: {
    /** Define the max memory allowed in Bytes */
    maxBytes?: number;
    /** Define the maximum number of message to send at once */
    maxMessages?: number;
  };
  /** Batch options if you prefer publishing message per batch */
  batchOptions?: BatchOptions;
}

/**
 * Message sent through the publish method
 */
export interface PublishPayload {
  attributes?: AnyProperties<string>;
  data: AnyProperties;
  orderingKey?: string;
}

/**
 * Options related to the PubSub client
 *
 * @interface PubSubOptions
 */
export interface PubSubOptions {
  /** Set the pubsub server host */
  host?: string;
  /** Set the pubsub server port */
  port?: number;
  /** Set to true if you want to create automatically all resources */
  autoCreate?: boolean;
  /** Set a prefix before each topics */
  topicsPrefix?: string;
  /** Set a prefix before each subscriptions */
  subscriptionsPrefix?: string;
  /** Authenticate to the real PubSub server */
  authentication?: Authentication;
  /** Common attributes to all messages */
  metadata?: AnyProperties<string>;
  /** Options applied to all subscriptions */
  globalSubscribeOptions?: SubscribeOptions;
  /** Options applied whenever a message is published */
  globalPublishOptions?: Omit<PublishOptions, 'topicName'>;
}
