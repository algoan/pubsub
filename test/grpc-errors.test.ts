import test from 'ava';

import { isAlreadyExistsError } from '../src/GoogleCloudPubSub/grpc-errors';

test('isAlreadyExistsError returns true for gRPC code 6', (t) => {
  t.true(isAlreadyExistsError({ code: 6 }));
});

test('isAlreadyExistsError returns false for unrelated errors', (t) => {
  t.false(isAlreadyExistsError({ code: 5, message: 'Not found' }));
  t.false(isAlreadyExistsError(undefined));
  t.false(isAlreadyExistsError(null));
  t.false(isAlreadyExistsError({ message: 'Resource already exists in the project' }));
});
