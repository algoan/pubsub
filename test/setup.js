const Emulator = require('google-pubsub-emulator');

module.exports = async function () {
  const projectId = 'algoan-test';
  const emulator = new Emulator({
    project: projectId,
    debug: process.env.EMULATOR_DEBUG === 'true',
  });

  await emulator.start();

  // Set reference to mongod in order to close the server during teardown.
  globalThis.GOOGLE_PUBSUB_EMULATOR = emulator;
};