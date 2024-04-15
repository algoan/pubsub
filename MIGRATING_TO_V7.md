# Migrating to v7

The Pub/Sub v7 contains huge breaking changes. Here is a list of all changes in order to help you to migrate to the v7 of @algoan/pubsub.

## Installation and package removal

- We've removed the pino dependency because we did not want to impose a specific logger. The idea now, is to have an abstract class so you can put your own logger if you wish to have logs.

- `@google-cloud/pubsub` has been moved to an optional peer dependency. **You must install it** if you wish to use @algoan/pubsub with Google Cloud Pub/Sub.

## `PubSubFactory.create`

Options have changed completely. In the v6, it was really specific to Google. Types were inherited from @google-cloud/pubsub directly. Now, we have created a `PubSubOptions` interface inspired by Google PubSub options, but does not require the Google lib anymore.

| v6 Options               | v7 options                                                                               |
|--------------------------|------------------------------------------------------------------------------------------|
| `debug`                  | Not implemented yet.                                                                     |
|  `pinoOptions`           | Removed                                                                                  |
| `topicsPrefix`           | `topicsPrefix`                                                                           |
| `topicsSeparator`        | Removed. Has to be put in the `topicsPrefix`                                             |
| `subscriptionsPrefix`    | `subscriptionsPrefix`                                                                    |
| `subscriptionsSeparator` | Removed. Has to be put in the ``subscriptionsPrefix`                                     |
| `namespace`              | Removed. If you still need it, create a namespace property in the `metadata` object.     |
| `environment`            | Removed. If you still need it, create an environment property in the  `metadata` object. |

> Topic and subscription separators does not exist anymore, you need to add them as prefixes if you've defined it.

## `pubsub.listen(event, opts) --> pubsub.subscribe(event, listener, opts)`

The listen method does not exist anymore. It has been replaced by the subscribe method. The listener method is required as an argument. Before that, it was defined in the `opts.onMessage` property. The options object has completely changed:

| v6 Options                           | v7 options                                                                                                                                                        |
|--------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `onMessage`                          | Removed. Is now a required argument of the subscribe method                                                                                                       |
| `onError`                            | `onError`                                                                                                                                                         |
| `options.autoAck`                    | `messageAckOptions.autoAck`                                                                                                                                       |
| `options.subscriptionOptions.name`   | `name`                                                                                                                                                            |
| `options.subscriptionOptions.get`    | Removed.                                                                                                                                                          |
| `options.subscriptionOptions.sub`    | Was used to define flow control, stream options, batch options or min and max ack deadline. These properties are now defined in the `SubscribeOptions` interface. |
| `options.subscriptionOptions.create` | Use now the `SubscribeOption` interface.                                                                                                                          |
| `options.topicOptions`               | Removed. These options must be set through the publisher.                                                                                                         |
| `options.topicName`                  | `topicName`                                                                                                                                                       |

> **The `autoAck` mode is not enabled by default!** You need to activate it in the subscribe options, or as global subscribe options.

## `pubsub.emit(event, payload, opts) --> pubsub.publish(event, payload, opts)`

The emit method has now been replaced by the publish method. The `payload` object has also changed. It contains two objects:

- `attributes`: custom metadata to add to each messages. Can be used to filter messages.
- `data`: Any JSON object.
- `orderingKey`: use it if you've enabled the ordering message option.

The publish option object has also changed:

| v6 Options               | v7 options                                                                             |
|--------------------------|----------------------------------------------------------------------------------------|
| `metadata`               | Custom attributes. Has been moved as an argument (`payload.attributes`)                |
| `options.topicOptions`   | Used to set options to the created topic. Refer now to the `PublishOptions` interface. |
| `options.publishOptions` | Used to set batch options. Refer now to the `PublishOptions` interface.                |
| `options.messageOptions` | Ordering key moved to the payload argument (`payload.orderingKey`)                     |