import { setImmediate } from 'node:timers/promises';

import { EmittedMessage, PubSub } from '../../../src';
import { PublishPayload, SubscribeOptions } from '../../../src/lib';

export class GooglePubSubTestUtils {
  constructor(private pubsub: PubSub) {}

  /**
   * Test a subscription by publishing a message on a specific channel
   * @param channel Channel to publish and subscribe
   * @param validateFn Function to execute in the listener
   * @param done Jest Done callback method
   * @param msgToSend Payload to publish (@default { data: {hello: "world"}})
   * @param validateFnAfterListener  Validate function to execute as soon as the listener has finished its work
   * @param maxNbOfDeliveryAttempt Set the maximum nb of delivery attempts. If > 0, the listener will throw an error to simulate a failure on the listener
   */
  public async subscribeAndPublish(options: {
    channel: string;
    validateFn: (msg: EmittedMessage) => void;
    done: jest.DoneCallback;
    msgToSend?: PublishPayload;
    validateFnAfterListener?: () => void;
    subscribeOptions?: SubscribeOptions;
    maxNbOfDeliveryAttempt?: number;
    orderingKey?: string;
  }) {
    const {
      channel,
      validateFn,
      done,
      msgToSend = { data: { hello: 'world' } },
      validateFnAfterListener,
      subscribeOptions,
      orderingKey,
    } = options;

    let maxNbOfDeliveryAttempt = options?.maxNbOfDeliveryAttempt ?? 0;

    const listener = (message: EmittedMessage): void => {
      const deliveryAttempt = message.deliveryAttempt ?? 1;
      if (deliveryAttempt < maxNbOfDeliveryAttempt) {
        throw new Error('Error thrown by the listener');
      }

      try {
        validateFn(message);
        if (!validateFnAfterListener) {
          done();
        } else {
          void this.callback(done, validateFnAfterListener);
        }
      } catch (err) {
        done(err);
      }
    };

    await this.pubsub.subscribe(channel, listener, subscribeOptions);
    if (!!orderingKey && !msgToSend.orderingKey) {
      msgToSend.orderingKey = orderingKey;
    }
    await this.pubsub.publish(channel, msgToSend, {
      enableMessageOrdering: !!orderingKey,
    });
  }

  /**
   * Callback to call when the subscribe listener has finished
   * @param done Jest done callback
   * @param validateFnAfterListener Validate function to execute as soon as the listener has finished its work
   */
  private async callback(done: jest.DoneCallback, validateFnAfterListener: () => void) {
    await setImmediate();
    try {
      validateFnAfterListener();
    } catch (err) {
      return done(err);
    }

    done();
  }
}
