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
        onMessage: (message: EmittedMessage<OnMessage>): void => {
          try {
            if (isPayloadError(message.payload)) {
              return reject('Error in payload');
            }

            const payload: OnMessage = message.payload;
            this.validateEmittedMessageProperties(message, payload);
            validateListenFn(message);
            resolve(true);
          } catch (err) {
            reject(err);
          }
        },
        onError: (error) => {
          reject(error);
        },
        options: listenOptions,
      });

      void this.emitAfterDelay();
    });
  }

  /**
   * Validate some properties of the Emitted Message
   * @param message Emitted message
   * @param payload Non error payload of the message
   */
  private validateEmittedMessageProperties(message: EmittedMessage<OnMessage>, payload: OnMessage) {
    this.avaExecCtx.deepEqual(payload, {
      hello: 'world',
    });
    this.avaExecCtx.truthy(message.id);
    this.avaExecCtx.truthy(message.ackId);
    this.avaExecCtx.truthy(message.emittedAt);
    this.avaExecCtx.truthy(message.receivedAt);
    this.avaExecCtx.truthy(message.duration);
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
