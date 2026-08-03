import { createClient } from "redis";

let redisClient;

export const connectCache = async () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is required to connect to Redis");
  }

  redisClient = createClient({
    url: redisUrl
  });

  redisClient.on("error", (error) => {
    console.error("Redis client error", error);
  });

  await redisClient.connect();
};

export const disconnectCache = async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
};
