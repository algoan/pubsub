import { GoogleCloudPubSub } from './GoogleCloudPubSub/GoogleCloudPubSub';
import { PubSubOptions } from './lib';
import { PubSub } from '.';

/**
 * PubSub factory class
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PubSubFactory {
  /**
   * Create a pubsub instance depending of the transport
   * @param params PubSub parameters
   */
  public static create(params: FactoryParameters): PubSub {
    switch (params.transport) {
      case Transport.GOOGLE_PUBSUB:
        return new GoogleCloudPubSub(params.options);
      default:
        throw new Error(`${params.transport} is not a valid transport`);
    }
  }
}
/**
 * Transport to use
 */
export enum Transport {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  GOOGLE_PUBSUB = 'GOOGLE_PUBSUB',
}

/**
 * Create instance parameters
 */
export interface FactoryParameters {
  transport: Transport;
  options?: PubSubOptions;
}
