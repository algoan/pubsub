import { Message, Subscription } from '@google-cloud/pubsub';
import { EmittedMessage, PubSub, PubSubFactory, Transport } from '../../src';
import { PubSubOptions, PublishPayload } from '../../src/lib';
import { clearCache, generateRandomChannelName } from './utils/tools';
import { GooglePubSubTestUtils } from './utils/test-utils';

describe('Tests related to the subscribe method of GoogleCloudPubSub', () => {
  describe('Tests STREAMING_PULL subscriptions', () => {
    let pubsub: PubSub;
    let spyAck: jest.SpyInstance;
    let testUtils: GooglePubSubTestUtils;

    const defaultOptions: PubSubOptions = {
      autoCreate: true,
    };

    beforeAll(() => {
      pubsub = PubSubFactory.create({
        transport: Transport.GOOGLE_PUBSUB,
        options: defaultOptions,
      });
      /** This spy is reset before each tests thanks to 'restMocks' global option (cf jest.config.js) */
      spyAck = jest.spyOn(Message.prototype, 'ack');
      testUtils = new GooglePubSubTestUtils(pubsub);
    });

    afterAll(async () => {
      await pubsub.close();
    });

    afterEach(async () => {
      await clearCache(pubsub);
      /** Set default options back */
      pubsub.setGlobalOptions(defaultOptions);
    });

    test('GPS200 - should listen to a emitted message and manually ack it', (done) => {
      const channel = generateRandomChannelName();

      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          message.ack();
          expect(spyAck).toHaveBeenCalledTimes(1);
          expect(message.ackId).toBeDefined();
          expect(message.duration).toBeDefined();
          expect(message.id).toBeDefined();
          expect(message.orderingKey).toBeUndefined();
          expect(message.getOriginalMessage() instanceof Message).toBeTruthy();
          expect(message.payload.hello).toEqual('world');
          expect(message.deliveryAttempt).toEqual(1);
        },
        done,
      });
    });

    test('GPS201 - should listen and automatically ack the message before calling listener', (done) => {
      const channel = generateRandomChannelName();

      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          expect(spyAck).toHaveBeenCalledTimes(1);
          expect(message.ackId).toBeDefined();
          expect(message.duration).toBeDefined();
          expect(message.id).toBeDefined();
          expect(message.orderingKey).toBeUndefined();
          expect(message.getOriginalMessage() instanceof Message).toBeTruthy();
          expect(message.payload.hello).toEqual('world');
          expect(message.deliveryAttempt).toEqual(1);
        },
        done,
        validateFnAfterListener: () => expect(spyAck).toHaveBeenCalledTimes(1),
        subscribeOptions: {
          messageAckOptions: {
            ackAfterListener: false,
            autoAck: true,
          },
        },
      });
    });

    test('GPS202 - should listen and ack message after the listener has been executed', (done) => {
      const channel = generateRandomChannelName();

      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          expect(spyAck).toHaveBeenCalledTimes(0);
          expect(message.ackId).toBeDefined();
          expect(message.duration).toBeDefined();
          expect(message.id).toBeDefined();
          expect(message.orderingKey).toBeUndefined();
          expect(message.getOriginalMessage() instanceof Message).toBeTruthy();
          expect(message.payload.hello).toEqual('world');
          expect(message.deliveryAttempt).toEqual(1);
        },
        done,
        validateFnAfterListener: () => expect(spyAck).toHaveBeenCalledTimes(1),
        subscribeOptions: {
          messageAckOptions: {
            ackAfterListener: true,
            autoAck: true,
          },
        },
      });
    });

    test('GPS203 - should call nack two times and then ack on the third time', (done) => {
      const channel = generateRandomChannelName();
      const nackSpy = jest.spyOn(Message.prototype, 'nack');

      const validateFn = (message: EmittedMessage) => {
        expect(nackSpy).toHaveBeenCalledTimes(2);
        expect(spyAck).toHaveBeenCalledTimes(0);
        expect(message.ackId).toBeDefined();
        expect(message.duration).toBeDefined();
        expect(message.id).toBeDefined();
        expect(message.orderingKey).toBeUndefined();
        expect(message.getOriginalMessage() instanceof Message).toBeTruthy();
        expect(message.payload.hello).toEqual('world');
        expect(message.deliveryAttempt).toEqual(3);
      };

      testUtils.subscribeAndPublish({
        channel,
        validateFn,
        done,
        subscribeOptions: {
          messageAckOptions: {
            nackIfError: true,
            autoAck: true,
            ackAfterListener: true,
          },
        },
        maxNbOfDeliveryAttempt: 3,
        validateFnAfterListener: () => expect(spyAck).toHaveBeenCalledTimes(1),
      });
    });

    test('GPS204 - should get the ordering key into the message', (done) => {
      const channel = generateRandomChannelName();
      const orderingKey = 'my_user_id';

      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          expect(spyAck).toHaveBeenCalledTimes(1);
          expect(message.ackId).toBeDefined();
          expect(message.duration).toBeDefined();
          expect(message.id).toBeDefined();
          expect(message.orderingKey).toEqual(orderingKey);
          expect(message.getOriginalMessage() instanceof Message).toBeTruthy();
          expect(message.payload.hello).toEqual('world');
          /**
           * According to Google, when the message ordering is enabled without deadletter policy,
           * the delivery attempt is equal to 0 instead of 1
           * @link https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions/pull#ReceivedMessage
           */
          expect(message.deliveryAttempt).toEqual(0);
        },
        done,
        validateFnAfterListener: () => expect(spyAck).toHaveBeenCalledTimes(1),
        subscribeOptions: {
          messageAckOptions: {
            ackAfterListener: false,
            autoAck: true,
          },
          enableMessageOrdering: true,
        },
        orderingKey,
      });
    });

    test('GPS205 - should listen to the error event', (done) => {
      const channel = generateRandomChannelName();
      const errorMockFn = jest.fn(() => {});
      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          expect(message.ackId).toBeDefined();
          expect(message.duration).toBeDefined();
          expect(message.id).toBeDefined();
          expect(message.orderingKey).toBeUndefined();
          expect(message.getOriginalMessage() instanceof Message).toBeTruthy();
          expect(message.payload.hello).toEqual('world');
          expect(message.deliveryAttempt).toEqual(1);
          /** Get the private subscriber client from the pubsub subscription to simulate an error */
          pubsub['subscriptions'].get(channel)._subscriber.emit('error', new Error('Subscriber error thrown'));
        },
        done,
        validateFnAfterListener: () => expect(errorMockFn).toHaveBeenCalledTimes(1),
        subscribeOptions: {
          messageAckOptions: {
            ackAfterListener: false,
            autoAck: true,
          },
          onError: errorMockFn,
        },
      });
    });

    test('GPS206 - should listen to the default error handler', (done) => {
      const channel = generateRandomChannelName();
      const spyConsoleLog = jest.spyOn(console, 'error');
      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          expect(message.ackId).toBeDefined();
          expect(message.duration).toBeDefined();
          expect(message.id).toBeDefined();
          expect(message.orderingKey).toBeUndefined();
          expect(message.getOriginalMessage() instanceof Message).toBeTruthy();
          expect(message.payload.hello).toEqual('world');
          expect(message.deliveryAttempt).toEqual(1);
          /** Get the private subscriber client from the pubsub subscription to simulate an error */
          pubsub['subscriptions'].get(channel)._subscriber.emit('error', new Error('Subscriber error thrown'));
        },
        done,
        validateFnAfterListener: () =>
          expect(spyConsoleLog).toHaveBeenCalledWith('An error occurred: Error: Subscriber error thrown'),
        subscribeOptions: {
          messageAckOptions: {
            ackAfterListener: false,
            autoAck: true,
          },
        },
      });
    });

    test('GPS207 - should listen to the close event', (done) => {
      const channel = generateRandomChannelName();
      const closeMockFn = jest.fn(() => {});
      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          expect(spyAck).toHaveBeenCalledTimes(1);
          expect(message.ackId).toBeDefined();
          expect(message.duration).toBeDefined();
          expect(message.id).toBeDefined();
          expect(message.orderingKey).toBeUndefined();
          expect(message.getOriginalMessage() instanceof Message).toBeTruthy();
          expect(message.payload.hello).toEqual('world');
          expect(message.deliveryAttempt).toEqual(1);
        },
        done,
        validateFnAfterListener: () =>
          pubsub['subscriptions']
            .get(channel)
            .close()
            .then(() => expect(closeMockFn).toHaveBeenCalledTimes(1)),
        subscribeOptions: {
          messageAckOptions: {
            ackAfterListener: false,
            autoAck: true,
          },
          onClose: closeMockFn,
        },
      });
    });

    test('GPS208 - should listen and automatically ack the message with exactly once enabled feature', (done) => {
      const channel = generateRandomChannelName();
      const ackWithResponseSpy = jest.spyOn(Message.prototype, 'ackWithResponse');
      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          expect(ackWithResponseSpy).toHaveBeenCalledTimes(1);
          expect(message.ackId).toBeDefined();
          expect(message.duration).toBeDefined();
          expect(message.id).toBeDefined();
          expect(message.orderingKey).toBeUndefined();
          expect(message.getOriginalMessage() instanceof Message).toBeTruthy();
          expect(message.payload.hello).toEqual('world');
          expect(message.deliveryAttempt).toEqual(1);
        },
        done,
        subscribeOptions: {
          messageAckOptions: {
            ackAfterListener: false,
            autoAck: true,
          },
          exactlyOnceDelivery: true,
        },
      });
    });

    test('GPS209 - should listen and automatically nack the message with exactly once enabled feature', (done) => {
      const channel = generateRandomChannelName();
      const ackWithResponseSpy = jest.spyOn(Message.prototype, 'ackWithResponse');
      const nackWithResponseSpy = jest.spyOn(Message.prototype, 'nackWithResponse');
      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          expect(nackWithResponseSpy).toHaveBeenCalledTimes(1);
          expect(message.ackId).toBeDefined();
          expect(message.duration).toBeDefined();
          expect(message.id).toBeDefined();
          expect(message.orderingKey).toBeUndefined();
          expect(message.getOriginalMessage() instanceof Message).toBeTruthy();
          expect(message.payload.hello).toEqual('world');
          expect(message.deliveryAttempt).toEqual(2);
        },
        done,
        subscribeOptions: {
          messageAckOptions: {
            ackAfterListener: true,
            autoAck: true,
            nackIfError: true,
          },
          exactlyOnceDelivery: true,
        },
        maxNbOfDeliveryAttempt: 2,
        validateFnAfterListener: () => {
          expect(ackWithResponseSpy).toHaveBeenCalledTimes(1);
          expect(nackWithResponseSpy).toHaveBeenCalledTimes(1);
        },
      });
    });

    test('GPS210 - should listen and modify the ack deadline', (done) => {
      const channel = generateRandomChannelName();
      const modAckSpy = jest.spyOn(Message.prototype, 'modAck');
      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          message.modAck(60);
          /**
           * The spy is called twice because of the _onData subscriber method
           * When a message is received, the @google-cloud/pubsub lib set the ackdeadline second
           * @link https://github.com/googleapis/nodejs-pubsub/blob/9589e9f1b65265cff588bb5577720c0de17a4b89/src/subscriber.ts#L853
           */
          expect(modAckSpy).toHaveBeenCalledTimes(2);
        },
        done,
        subscribeOptions: {
          messageAckOptions: {
            ackAfterListener: true,
            autoAck: true,
          },
          exactlyOnceDelivery: false,
        },
      });
    });

    test('GPS211 - should listen and modify the ack deadline with a response', (done) => {
      const channel = generateRandomChannelName();
      const modAckSpy = jest.spyOn(Message.prototype, 'modAckWithResponse');
      testUtils.subscribeAndPublish({
        channel,
        validateFn: (message: EmittedMessage) => {
          message.modAck(60);
          /**
           * The spy is called twice because of the _onData subscriber method
           * When a message is received, the @google-cloud/pubsub lib set the ackdeadline second
           * @link https://github.com/googleapis/nodejs-pubsub/blob/9589e9f1b65265cff588bb5577720c0de17a4b89/src/subscriber.ts#L853
           */
          expect(modAckSpy).toHaveBeenCalledTimes(2);
        },
        done,
        subscribeOptions: {
          messageAckOptions: {
            ackAfterListener: true,
            autoAck: true,
          },
          exactlyOnceDelivery: true,
        },
      });
    });

    test('GPS212 - should publish a batch of messages', (done) => {
      const channel = generateRandomChannelName();
      const batchMessages: PublishPayload[] = [];
      for (let i = 0; i < 10; i++) {
        batchMessages.push({
          data: {
            hello: 'batch',
          },
          attributes: {
            env: 'test',
          },
        });
      }
      let messageReceived = 0;

      const listenerMock = jest.fn((message: EmittedMessage) => {
        expect(message.metadata?.env).toEqual('test');
        messageReceived++;
        if (messageReceived === batchMessages.length) {
          try {
            expect(listenerMock).toHaveBeenCalledTimes(batchMessages.length);
            done();
          } catch (err) {
            done(err);
          }
        }
      });

      pubsub
        .subscribe(channel, listenerMock, {
          messageAckOptions: {
            autoAck: true,
          },
        })
        .then(() => {
          return pubsub.publish(channel, batchMessages);
        });
    });

    test('GPS213 - should not listen because unsubscribed', (done) => {
      const channel = generateRandomChannelName();

      const listenerMock = jest.fn(() => {
        done(new Error('The listener should not be called'));
      });

      pubsub
        .subscribe(channel, listenerMock, {
          messageAckOptions: {
            autoAck: true,
          },
        })
        .then(() => {
          return pubsub.unsubscribe(channel);
        })
        .then(() => {
          expect(pubsub['subscriptions'].get(channel).isOpen).toBeFalsy();
          return pubsub.publish(channel, { data: {} });
        })
        .then(() => {
          expect(listenerMock).not.toHaveBeenCalled();
          done();
        });
    });

    test('GPS214 - should still listen because unsubscribed to a wrong channel', (done) => {
      const channel = generateRandomChannelName();
      pubsub.setGlobalOptions({
        metadata: {
          myChannel: channel,
        },
      });

      const listenerMock = jest.fn((message: EmittedMessage) => {
        try {
          expect(message?.metadata).toMatchObject({
            env: 'test',
            myChannel: channel,
          });
          done();
        } catch (err) {
          done(err);
        }
      });

      pubsub
        .subscribe(channel, listenerMock, {
          messageAckOptions: {
            autoAck: true,
          },
        })
        .then(() => {
          return pubsub.unsubscribe('wrong channel');
        })
        .then(() => {
          try {
            expect(pubsub['subscriptions'].get(channel).isOpen).toBeTruthy();
          } catch (err) {
            done(err);
          }
          return pubsub.publish(channel, { data: {}, attributes: { env: 'test' } });
        });
    });

    test('GPS215 - should return en empty object because cannot parse data', (done) => {
      const channel = generateRandomChannelName();
      JSON.parse = jest.fn().mockImplementationOnce(() => {
        throw Error('Fake JSON parse throws an error');
      });
      pubsub
        .subscribe(
          channel,
          (msg: EmittedMessage) => {
            try {
              expect(msg.payload).toMatchObject({});
              done();
            } catch (err) {
              done(err);
            }
          },
          {
            messageAckOptions: {
              autoAck: true,
            },
          },
        )
        .then(() => {
          return pubsub.publish(channel, { data: { hello: 'world' } });
        });
    });
  });

  describe('Tests PULL subscriptions', () => {
    let pubsub: PubSub;

    const defaultOptions: PubSubOptions = {
      autoCreate: true,
    };

    beforeAll(() => {
      pubsub = PubSubFactory.create({
        transport: Transport.GOOGLE_PUBSUB,
        options: defaultOptions,
      });
    });

    afterAll(async () => {
      await pubsub.close();
    });

    afterEach(async () => {
      await clearCache(pubsub);
      /** Set default options back */
      pubsub.setGlobalOptions(defaultOptions);
    });

    it('GPS300 - should do nothing (not implemented yet)', async () => {
      const channel = generateRandomChannelName();
      const listener = () => {};

      await pubsub.subscribe(channel, listener, {
        mode: 'PULL',
      });

      const subscription: Subscription = pubsub['subscriptions'].get(channel);
      /** Since no new listener are registered, no stream is open */
      expect(subscription.isOpen).toBeFalsy();
    });
  });

  describe('Tests PUSH subscriptions', () => {
    let pubsub: PubSub;

    const defaultOptions: PubSubOptions = {
      autoCreate: true,
    };

    beforeAll(() => {
      pubsub = PubSubFactory.create({
        transport: Transport.GOOGLE_PUBSUB,
        options: defaultOptions,
      });
    });

    afterAll(async () => {
      await pubsub.close();
    });

    afterEach(async () => {
      await clearCache(pubsub);
      /** Set default options back */
      pubsub.setGlobalOptions(defaultOptions);
    });

    it('GPS400 - should do nothing (not implemented yet)', async () => {
      const channel = generateRandomChannelName();
      const listener = () => {};

      await pubsub.subscribe(channel, listener, {
        mode: 'PUSH',
        pushOptions: {
          endpoint: 'https://...',
        },
      });

      const subscription: Subscription = pubsub['subscriptions'].get(channel);
      /** Since no new listener are registered, no stream is open */
      expect(subscription.isOpen).toBeFalsy();
    });
  });
});
