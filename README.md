<div align="center">
  <img src="./assets/pubsub_logo.png">
  <br />
</div>

A generic PubSub factory made to simplify cloud providers native client. Change Pub/Sub provider with a simple parameter.

_NOTE_: Today, only [Google Cloud PubSub](https://cloud.google.com/pubsub/docs/overview) has been added. More to come!

# Features

- Just `subscribe` and `publish`. The rest is handled by the library.
- Send a single or a batch of messages.
- Exponential retry backoff.
- Handle several modes: streaming, synchronous pull, push notifications.

# MIGRATION TO V7

The 7th version includes huge breaking changes and massive updates! Follow the guide in order to understand such a refactoring and how to migrate to the v7: [MIGRATING](./MIGRATING_TO_V7.md)

# Usage

You must choose a Pub/Sub provider:

- For [Google Cloud Pub/Sub](https://cloud.google.com/pubsub):

```bash
npm install @algoan/pubsub
npm install @google-cloud/pubsub
```

```typescript
import { PubSubFactory, Transport } from '@algoan/pubsub'

const pubsub = PubSubFactory.create({
  transport: Transport.GOOGLE_PUBSUB,
  options: {}
})
```

## API

Definition of each method and property

### `PubSubFactory.create(params)`

Create a PubSub instance.

#### `params.transport`

Choose a transport behind the @algoan/pubsub lib.

- `GOOGLE_PUBSUB`: create a Google Pub/Sub client. **Requires the [@google-cloud/pubsub](https://github.com/googleapis/nodejs-pubsub) lib**.


#### `params.options`

Options related to the Pubsub client.

```typescript
interface PubSubOptions {
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
  authentication?: {
    /** ID of the project */
    id?: string
    /** Path of the key file name **/
    keyFilePath?: string
  };
  /** Common attributes to all messages. Can be any string properties. */
  metadata?: {
    [key: string]: string
  };
  /** Options applied to all subscriptions */
  globalSubscribeOptions?: SubscribeOptions;
  /** Options applied whenever a message is published */
  globalPublishOptions?: Omit<PublishOptions, 'topicName'>;
}
```

### The PubSub instance

APIs related to the Pubsub instance.

#### `pubsub.getNativeClient()`

This method returns the native Pubsub client from the transport.

Example:

```typescript
import { PubSub } from '@google-cloud/pubsub';

const client: PubSub = pubsub.getNativeClient();
```

#### `pubsub.subscribe(channel, listener, subscribeOptions?)`

Subscribe to a channel and listen to messages.

- `channel` {string}: Name of the channel you want to subscribe to.
- `listener` {(message: EmittedMessage) => void | Promise<void>}: Function to call whenever a message is sent through the channel.
- `subscribeOptions` {SubscribeOption}:

```typescript
interface SubscribeOptions {
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
```

_Example_:

```typescript
import { PubSubFactory, EmittedMessage } from '@algoan/pubsub';

const pubsub = PubSubFactory.create({ transport: 'GOOGLE_PUBSUB'});

await pubsub.subscribe('my_channel', (message: EmittedMessage) => {
  console.log(message);
}, {
  messageAckOptions: {
    autoAck: true,
  }
})
```

#### `pubsub.unsubscribe(channel)`

Stop listening to a specific channel. Close the connection between the client and the server.

```typescript
import { PubSubFactory, EmittedMessage } from '@algoan/pubsub';

const pubsub = PubSubFactory.create({ transport: 'GOOGLE_PUBSUB'});

await pubsub.subscribe('my_channel', (message: EmittedMessage) => {
  console.log(message);
}, {
  messageAckOptions: {
    autoAck: true,
  }
})

// No more message will be listened?
await pubsub.unsubscribe('my_channel');
```

#### `pubsub.publish(channel, payload, publishOptions?)`

Publish one or several messages to a specific channel.

- `channel` {string}: Name of the channel you want to publish to.
- `payload` {object}: a payload contains two properties. 
  - `attributes`: Metadata regarding the message. It is an object of string properties.
  - `data`: An object with any properties. The main content of the message.
  - `orderingKey`: If the message ordering is enabled, set a key to messages.
- `publishOptions` {object}: Options related to the publish method.

```typescript
interface PublishOptions {
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
  batchOptions?: {
    /** Max messages to store in the internal queue */
    maxMessages?: number;
    /** Max memory allowed in the internal queue */
    maxBytes?: number;
    /** Max duration before sending the batch of requests */
    maxMs?: number;
  };
}
```

#### `pubsub.setGlobalOptions(options)`

Update the PubSub client option object at runtime. 

- `options` {object}: Refer to the [PubSubOptions interface](#paramsoptions)

#### `pubsub.close()`

Close all connections to the server.

# Contribution

Thank you for your future contribution 😁 Please follow [these instructions](CONTRIBUTING.md) before opening a pull request!