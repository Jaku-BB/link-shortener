import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: 'banned-word-consumer',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'banned-word-group' });

async function run() {
  await consumer.connect();
  console.log('Kafka consumer connected');

  await consumer.subscribe({ topic: 'banned-url-alerts', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.value?.toString();
      if (value) {
        const alert = JSON.parse(value);
        console.log('🚨 BANNED WORD ALERT:', {
          timestamp: alert.timestamp,
          url: alert.url,
          bannedWord: alert.bannedWord,
          service: alert.service
        });
      }
    },
  });
}

run().catch(console.error);

Deno.addSignalListener("SIGINT", async () => {
  console.log("Shutting down consumer...");
  await consumer.disconnect();
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", async () => {
  console.log("Shutting down consumer...");
  await consumer.disconnect();
  Deno.exit(0);
}); 