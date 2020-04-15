# PubSub

This is a generic PubSub Factory exposing a listen and a emit method.

_NOTE_: Today, only [Google Cloud PubSub](https://cloud.google.com/pubsub/docs/overview) has been added.

## Installation

```bash
npm install --save @algoan/pubsub
```

## Setup for simulator

You need to have a google account and have installed gcloud sdk.

Then, you need to install the simulator with:

```shell
gcloud components install pubsub-emulator
gcloud components update
```

## Launch the tests

Start the tests in another terminal with:

```shell
npm test
```

It will launch a Google PubSub emulator

## Usage

To create a PubSub instance using Google Cloud:

```typescript
import { ExtendedMessage, PubSub, PubSubFactory, Transport } from '@algoan/pubsub'

const pubSub: PubSub = PubSubFactory.create({
  transport: Transport.GOOGLE_PUBSUB,
  options: {
    projectId: 'test',
    // And all other Google PubSub properties
  }
});
const topicName: string = 'some_topic';

await pubsub.listen(topicName, {
  autoAck: true,
  onMessage: (data: ExtendedMessage<{foo: string}>) => {
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

This module uses [semantic-release](https://github.com/semantic-release/semantic-release), please follow these [instructions](https://github.com/semantic-release/commit-analyzer#default-rules-matching) to contribute to the project or use `npm run commit`.

## API

### `PubSubFactory.create({ transport, options })`

The only static method from the `PubSubFactory` class. It initiates a new PubSub instance depending on the `transport`. By default, it connects to [Google Cloud PubSub](https://googleapis.dev/nodejs/pubsub/latest/index.html).

- `transport`: PubSub technology to use. Only `GOOGLE_PUBSUB` is available for now.
- `options`: Options related to the transport.
  - If `transport === Transport.GOOGLE_PUBSUB`, then have a look at the [Google Cloud PubSub config client](https://googleapis.dev/nodejs/pubsub/latest/global.html#ClientConfig).
  - `debug`: Display logs if it is set to true. It uses a [pino logger](https://getpino.io/#/) and [pino-pretty](https://github.com/pinojs/pino-pretty) if `NODE_ENV` is not equal to `production`.
  - `topicsPrefix`: Add a prefix to all created topics. Example: `topicsPrefix: 'my-topic'`, all topics will begin with `my-topic+{your topic name}`.
  - `subscriptionsPrefix`: Add a prefix to all created subscriptions. Example: `subscriptionsPrefix: 'my-sub'`, all topics will begin with `my-sub%{your topic name}`.
  - `namespace`: Add a namespace property to [Message attributes](https://googleapis.dev/nodejs/pubsub/latest/google.pubsub.v1.html#.PubsubMessage) when publishing on a topic.
  - `environment`: Add a environment property to [Message attributes](https://googleapis.dev/nodejs/pubsub/latest/google.pubsub.v1.html#.PubsubMessage) when publishing on a topic.

### `pubsub.listen(event, options)`

Listen to a specific event.

_NOTE_: It only uses the [Google Cloud subscription pull](https://cloud.google.com/pubsub/docs/pull) delivery for now.

- `event`: Name of the event.
- `options`: Options related to the Listener method
  - `onMessage`: Method called when receiving a message
  - `onError`: Method called when an error occurs
  - `autoAck`: Automatically ACK an event as soon as it is received (default to `true`)
  - `subscriptionOptions`: Options applied to the subscription (have a look at [Subscription options](https://googleapis.dev/nodejs/pubsub/latest/Subscription.html#get))
  - `topicOptions`: Options applied to the created topic (have a look at [Topic options](https://googleapis.dev/nodejs/pubsub/latest/Topic.html#get))

### `pubsub.emit(event, payload, options)`

Emit a specific event with a payload. It added attributes in the message if you have added a namespace or an environment when setting the `PubSubFactory` class. It also adds an `_eventName` and a `time` property in the emitted `payload`.

- `event`: Name of the event to emit.
- `payload`: Payload to send. It will be buffered by Google, and then parsed by the [listen](#pubsublistenevent-options) method.
- `options`: Options related to the Emit method
  - `customAttributes`: Add custom attributes which will be stored in the `message.attributes` property.
  - `subscriptionOptions`: Options applied to the subscription (have a look at [Subscription options](https://googleapis.dev/nodejs/pubsub/latest/Subscription.html#get))
  - `topicOptions`: Options applied to the created topic (have a look at [Topic options](https://googleapis.dev/nodejs/pubsub/latest/Topic.html#get))
