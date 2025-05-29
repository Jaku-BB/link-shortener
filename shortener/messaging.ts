import { Kafka } from "kafkajs";
import type { BannedWordDetection } from "./banned-words.ts";

const kafka = new Kafka({
  clientId: 'link-shortener',
  brokers: [Deno.env.get("KAFKA_BROKER") || 'localhost:9092']
});

const producer = kafka.producer();

let isConnected = false;

export async function initializeKafka(): Promise<void> {
  try {
    await producer.connect();
    isConnected = true;
    console.log('Kafka producer connected successfully');
  } catch (error) {
    console.error('Failed to connect to Kafka:', error);
    isConnected = false;
  }
}

export async function sendBannedWordAlert(detection: BannedWordDetection): Promise<void> {
  if (!isConnected) {
    console.warn('Kafka producer not connected, skipping message');
    return;
  }

  try {
    const message = {
      timestamp: detection.timestamp.toISOString(),
      url: detection.url,
      bannedWord: detection.bannedWord,
      service: 'link-shortener'
    };

    await producer.send({
      topic: 'banned-url-alerts',
      messages: [
        {
          key: `banned-word-${Date.now()}`,
          value: JSON.stringify(message),
          timestamp: detection.timestamp.getTime().toString()
        }
      ]
    });

    console.log('Banned word alert sent to Kafka:', message);
  } catch (error) {
    console.error('Failed to send message to Kafka:', error);
  }
}

export async function shutdownKafka(): Promise<void> {
  if (isConnected) {
    try {
      await producer.disconnect();
      console.log('Kafka producer disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka producer:', error);
    }
  }
} 