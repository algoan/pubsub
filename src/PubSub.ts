import { PubSub as GPubSub } from '@google-cloud/pubsub';
import { EmitOptions, ListenOptions } from './GoogleCloudPubSub';

/**
 * PubSub generic interface
 */
export interface PubSub {
  client: GPubSub;

  /**
   * Listen to a subscription
   * @param event Event to listen to
   * @param handlers Message handler
   */
  listen<T>(event: string, options?: ListenOptions<T>): Promise<void>;

  /**
   * Emit an event
   * @param event Event to emit
   */
  emit<T>(event: string, data: T, options?: EmitOptions): Promise<string>;
}
