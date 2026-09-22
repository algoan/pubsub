import { GCPubSub, GoogleCloudPubSub, GooglePubSubOptions } from './GoogleCloudPubSub';

/**
 * PubSub factory class
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- static factory, kept as a class for backward compatibility
export class PubSubFactory {
  /**
   * Create a pubsub instance depending of the transport
   * @param params PubSub parameters
   */
  public static create(params: FactoryParameters = { transport: Transport.GOOGLE_PUBSUB }): GCPubSub {
    return new GoogleCloudPubSub(params.options);
  }
}

/**
 * Transport to use
 */
export enum Transport {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- public API value, kept as-is for backward compatibility
  GOOGLE_PUBSUB = 'GOOGLE_PUBSUB',
}

/**
 * Create instance parameters
 */
export interface FactoryParameters {
  transport: Transport;
  options?: GooglePubSubOptions;
}
