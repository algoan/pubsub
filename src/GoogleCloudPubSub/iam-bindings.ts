import { setTimeout } from 'timers/promises';

import { Topic } from '@google-cloud/pubsub';

import { isAbortedError } from './grpc-errors';

const maxAttempts = 5;
const initialRetryDelayMs = 50;
const retryBackoffFactor = 2;

type IamHandle = Topic['iam'];

/**
 * Adds a role binding to an IAM policy, tolerating concurrent writers.
 *
 * setPolicy is an etag-guarded read-modify-write, so when several callers update the same
 * policy at once all but one are rejected with ABORTED. Each attempt re-reads the policy, so
 * a binding another caller already added is found and no write is sent.
 * @param iam - IAM handle of the topic or subscription to update
 * @param role - Role to grant
 * @param member - Member to grant it to
 */
export const grantIamRole = async (iam: IamHandle, role: string, member: string): Promise<void> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const [policy] = await iam.getPolicy();
    const bindings = policy.bindings ?? [];

    if (bindings.some((binding) => binding.role === role && (binding.members?.includes(member) ?? false))) {
      return;
    }

    try {
      await iam.setPolicy({ ...policy, bindings: [...bindings, { role, members: [member] }] });

      return;
    } catch (error: unknown) {
      if (!isAbortedError(error) || attempt === maxAttempts) {
        throw error;
      }

      await setTimeout(initialRetryDelayMs * retryBackoffFactor ** (attempt - 1));
    }
  }
};
