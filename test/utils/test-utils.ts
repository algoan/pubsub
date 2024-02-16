import { setTimeout } from 'timers/promises';
import { ExecutionContext } from 'ava';

import { EmitOptions, EmittedMessage, GCListenOptions, GCPubSub, isPayloadError } from '../../src';
import { OnMessage } from './lib';

/**
 * Test utils for the Google PubSub class
 */
export class TestUtils {
  /**
   * Create a test util instance in order to validate common scenarios
   * @param pubSub Pubsub client
   * @param topicName Topic name
   * @param avaExecCtx AVAJS execution context
   * @param topicOptions Options related to the topic
   */
  constructor(
    public pubSub: GCPubSub,
    public topicName: string,
    public avaExecCtx: ExecutionContext,
    public topicOptions: EmitOptions<GCListenOptions> = {},
  ) {}

  /**
   * Emit and Listen to a message. Assert results with the Ava execution context.
   * @param validateListenFn Custom validation function with the emitted message as argument
   * @param listenOptions Options attached to the listen method
   */
  public async validateListenAndEmit(
    validateListenFn: (msg: EmittedMessage<OnMessage>) => void,
    listenOptions?: GCListenOptions,
  ) {
    await new Promise((resolve, reject) => {
      void this.pubSub.listen(this.topicName, {
        onMessage: this.handleMessage.bind(this, validateListenFn, resolve),
        onError: this.handleError.bind(this, reject),
        options: listenOptions,
      });

      void this.emitAfterDelay();
    });
  }

  /**
   * Validate the unsubscription by rejecting the promise if a message is listened
   * @param subscriptionName Name of the subscription to unsubscribe to
   * @param shouldListen set to true if you do not want to reject the onMessage method
   * @param validateListenFn Custom validation function with the emitted message as argument
   * @param listenOptions Listen options
   */
  public async validateNotListeningAndEmit(
    subscriptionName: string,
    shouldListen: boolean = false,
    validateListenFn?: (msg: EmittedMessage<OnMessage>) => void,
    listenOptions?: GCListenOptions,
  ) {
    await new Promise(async (resolve, reject) => {
      await this.pubSub.listen(this.topicName, {
        onMessage:
          shouldListen && validateListenFn
            ? this.handleMessage.bind(this, validateListenFn, resolve)
            : this.handleUnsubscribeMessage.bind(this, subscriptionName, reject),
        onError: this.handleError.bind(this, reject),
        options: listenOptions,
      });

      await this.pubSub.unsubscribe(subscriptionName);

      void this.emitAfterDelay();

      await setTimeout(2000);

      resolve(true);
    });
  }

  /**
   * Handle emitted messages
   * @param validateListenFn Custom validation function with the emitted message as argument
   * @param resolve Promise resolve function
   * @param message Emitted message
   */
  private handleMessage(
    validateListenFn: (msg: EmittedMessage<OnMessage>) => void,
    resolve: (val: unknown) => void,
    message: EmittedMessage<OnMessage>,
  ): void {
    try {
      if (isPayloadError(message.payload)) {
        throw new Error('Error in payload');
      }

      const payload: OnMessage = message.payload;
      this.validateEmittedMessageProperties(message, payload);
      validateListenFn(message);
      resolve(true);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Handle errors
   * @param reject Promise reject function
   * @param error Error object
   */
  private handleError(reject: (reason?: any) => void, error: any): void {
    reject(error);
  }

  /**
   * Handle messages after unsubscribe
   * @param subscriptionName Subscription name
   * @param reject Promise reject function
   */
  private handleUnsubscribeMessage(subscriptionName: string, reject: (reason?: any) => void): void {
    reject(`Should not listen to anything, because unsubscribed from subscription ${subscriptionName}`);
  }

  /**
   * Validate some properties of the Emitted Message
   * @param message Emitted message
   * @param payload Non error payload of the message
   */
  private validateEmittedMessageProperties(message: EmittedMessage<OnMessage>, payload: OnMessage) {
    const { avaExecCtx } = this;
    avaExecCtx.deepEqual(payload, { hello: 'world' });
    ['id', 'ackId', 'emittedAt', 'receivedAt', 'duration'].forEach((property) => {
      avaExecCtx.truthy(message[property as keyof EmittedMessage<OnMessage>]);
    });
  }

  /**
   * Emit an event after a certain delay
   * @param delay Number of ms to wait for
   */
  private async emitAfterDelay(delay: number = 1000): Promise<void> {
    await setTimeout(delay);
    await this.pubSub.emit(this.topicName, { hello: 'world' }, this.topicOptions);
  }
}
