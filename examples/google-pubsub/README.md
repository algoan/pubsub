# PubSub Example: Google Cloud Pub/Sub

Sample Express application in order to test the @algoan/pubsub library with Google Pub/Sub.

## Getting Started

Install dependencies:

```shell
npm i
```

Run a google Pub/Sub emulator using gcloud CLI. You must ensure that `beta` and `pubsub-emulator` are installed:

```shell
gcloud components install pubsub-emulator
gcloud components install beta
gcloud components update
````

You can also run the emulator using Docker:

```shell
docker pull google/cloud-sdk:emulators
docker run --rm -p 8085:8085 google/cloud-sdk:emulators /bin/bash -c "gcloud beta emulators pubsub start --project=test --host-port='0.0.0.0:8085'"  
```

Then, run:

```shell
npm start
```

Navigate on http://localhost:3000! To emit an event, simply call GET http://localhost:3000/emit. To close the subscription server collection, call the GET http://localhost:3000/close API.