process.env.PUBSUB_EMULATOR_HOST = 'localhost:8085';
process.env.PUBSUB_PROJECT_ID = 'test';

const express = require('express');
const timers = require('timers/promises');
const app = express();
const port = 3000;
const Pubsub = require('@algoan/pubsub');
const topicName = 'my_topic';

const pubsubClient = Pubsub.PubSubFactory.create({
  transport: 'GOOGLE_PUBSUB',
  options: {
    autoCreate: true,
    projectId: 'test',
  },
});
const secondPubsubClient = Pubsub.PubSubFactory.create({
  transport: 'GOOGLE_PUBSUB',
  options: {
    autoCreate: true,
    projectId: 'test',
  },
});

let pubsubCall = 0;

app.get('/', (req, res) => {
  res.send(`PubSub calls: ${pubsubCall}`);
});

app.get('/emit', async (req, res) => {
  secondPubsubClient.publish(topicName, { data: { hello: 'world' } });
  await timers.setTimeout(1000);
  res.redirect('/');
});

app.get('/close', async (req, res) => {
  await pubsubClient.unsubscribe(topicName);
  await timers.setTimeout(1000);
  res.redirect('/');
});

app.listen(port, async () => {
  await pubsubClient.subscribe(
    topicName,
    (message) => {
      console.log('Received message! ', message);
      pubsubCall++;
    },
    {
      messageAckOptions: {
        autoAck: true,
      },
    },
  );
  console.log(`Example app listening on port ${port}`);
});
