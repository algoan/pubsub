import { GCPubSub, GoogleCloudPubSub, GooglePubSubOptions } from './GoogleCloudPubSub';

/**
 * PubSub factory class
 */
// tslint:disable-next-line: no-unnecessary-class
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
  GOOGLE_PUBSUB = 'GOOGLE_PUBSUB',
}

/**
 * Create instance parameters
 */
export interface FactoryParameters {
  transport: Transport;
  options?: GooglePubSubOptions;
}
