module.exports = async function () {
  await globalThis.GOOGLE_PUBSUB_EMULATOR.stop();
};