import { v4 } from 'uuid';

/**
 * Generate a random topic name
 * @returns
 */
export const generateRandomTopicName = (): string => `topic_${v4()}`;
