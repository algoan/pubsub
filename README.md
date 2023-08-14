# PubSub

This is a generic PubSub Factory exposing a listen and a emit method.

_NOTE_: Today, only [Google Cloud PubSub](https://cloud.google.com/pubsub/docs/overview) has been added.

## Installation

```bash
npm install --save @algoan/pubsub
```

## Usage

### Google Cloud PubSub

#### Run tests

To run tests or to try the PubSubFactory class, you need to have a google account and have installed gcloud sdk.

Then, to install the [Google PubSub simulator](https://cloud.google.com/pubsub/docs/emulator), run:

```shell
gcloud components install pubsub-emulator
gcloud components update
```

Start tests running:

```shell
npm test
```

It will launch a Google PubSub emulator thanks to the [google-pubsub-emulator](https://github.com/ert78gb/google-pubsub-emulator) library.


#### Example

To create a PubSub instance using Google Cloud:

```typescript
import { EmittedMessage, GCPubSub, PubSubFactory, Transport } from '@algoan/pubsub'

const pubsub: GCPubSub = PubSubFactory.create({
  transport: Transport.GOOGLE_PUBSUB,
  options: {
    projectId: 'test',
    // And all other Google PubSub properties
  }
});
const topicName: string = 'some_topic';

await pubsub.listen(topicName, {
  autoAck: true,
  onMessage: (data: EmittedMessage<{foo: string}>) => {
    console.log(data.parsedData); // { foo: 'bar', time: {Date.now}, _eventName: 'some_topic' }
    // do whatever you want. The message has already been acknowledged
  },
  onError: (error: Error) => {
    // Handle error as you wish
  }
});

await pubsub.emit(topicName, { foo: 'bar' });
```

### Contribution

Thank you for your future contribution 😁 Please follow [these instructions](CONTRIBUTING.md) before opening a pull request!

## API

### `PubSubFactory.create({ transport, options })`

The only static method from the `PubSubFactory` class. It initiates a new PubSub instance depending on the `transport`. By default, it connects to [Google Cloud PubSub](https://googleapis.dev/nodejs/pubsub/latest/index.html).

- `transport`: PubSub technology to use. Only `GOOGLE_PUBSUB` is available for now.
- `options`: Options related to the transport.
  - If `transport === Transport.GOOGLE_PUBSUB`, then have a look at the [Google Cloud PubSub config client](https://googleapis.dev/nodejs/pubsub/latest/global.html#ClientConfig).
  - `debug`: Display logs if it is set to true. It uses a [pino logger](https://getpino.io/#/) and [pino-pretty](https://github.com/pinojs/pino-pretty) if `NODE_ENV` is not equal to `production`.
  - `pinoOptions`: If `debug` is set to true, set the [pino logger options](https://getpino.io/#/docs/api?id=options). Default to `level: debug` and `prettyPrint: true` if `NODE_ENV` is not equal to `production`.
  - `topicsPrefix`: Add a prefix to all created topics. Example: `topicsPrefix: 'my-topic'`, all topics will begin with `my-topic+{your topic name}`.
  - `topicsSeparator`: Customize separator between topicsPrefix and topic name. Example: `topicsSeparator: '-'`, all topics will be  `{topic prefix}-{your topic name} (default to '+')`.
  - `subscriptionsPrefix`: Add a prefix to all created subscriptions. Example: `subscriptionsPrefix: 'my-sub'`, all subscriptions will begin with `my-sub%{your topic name}`.
  - `subscriptionsSeparator`: Customize separator between subscriptionsPrefix and topic name. Example: `subscriptionsSeparator: '-'`, all subscriptions will be  `{subscription prefix}-{your topic name} (default to '%')`.
  - `namespace`: Add a namespace property to [Message attributes](https://googleapis.dev/nodejs/pubsub/latest/google.pubsub.v1.html#.PubsubMessage) when publishing on a topic.
  - `environment`: Add a environment property to [Message attributes](https://googleapis.dev/nodejs/pubsub/latest/google.pubsub.v1.html#.PubsubMessage) when publishing on a topic.

### `pubsub.listen(event, opts)`

Listen to a specific event.

_NOTE_: It only uses the [Google Cloud subscription pull](https://cloud.google.com/pubsub/docs/pull) delivery for now.

- `event`: Name of the event.
- `opts`: Options related to the Listener method
  - `onMessage`: Method called when receiving a message
  - `onError`: Method called when an error occurs
  - `options`: Option related to the chosen transport

If the chosen transport is Google Cloud PubSub, then `options` would be:

- `autoAck`: Automatically ACK an event as soon as it is received (default to `true`)
- `subscriptionOptions`: Options related to the created Subscription:
  - `name`: Custom name for the subscription. Default: `event` (also equal to the topic name)
  - `get`: Options applied to the `getSubscription` method (have a look at [Subscription options](https://googleapis.dev/nodejs/pubsub/latest/Subscription.html#get))
  - `sub`: Options applied to the subscription instance (see also [`setOptions` method](https://googleapis.dev/nodejs/pubsub/latest/Subscription.html#setOptions))
  - `create`: Options applied to the `createSubscription` method (have a look at [Create Subscription options](https://googleapis.dev/nodejs/pubsub/latest/Topic.html#createSubscription))
- `topicOptions`: Options applied to the created topic (have a look at [Topic options](https://googleapis.dev/nodejs/pubsub/latest/Topic.html#get))
- `topicName`: Set the topic name. By default, it uses the default name with a prefix.

### `pubsub.emit(event, payload, opts)`

Emit a specific event with a payload. It added attributes in the message if you have added a namespace or an environment when setting the `PubSubFactory` class. It also adds an `_eventName` and a `time` property in the emitted `payload`.

- `event`: Name of the event to emit.
- `payload`: Payload to send. It will be buffered by Google, and then parsed by the [listen](#pubsublistenevent-options) method.
- `opts`: Options related to the Emit method
  - `metadata`: Custom metadata added to the message
  - `options`: Option related to the chosen transport

If the chosen transport is Google Cloud PubSub, then `options` would be:

- `topicOptions`: Options applied to the created topic (have a look at [Topic options](https://googleapis.dev/nodejs/pubsub/latest/Topic.html#get))
- `publishOptions`: Publish options set to the topic after its creation. Refer to [Publish Options](https://googleapis.dev/nodejs/pubsub/latest/global.html#PublishOptions)
- `messageOptions`: Additional message options added to the message. Refer to [Message Options](https://googleapis.dev/nodejs/pubsub/latest/google.pubsub.v1.IPubsubMessage.html)
