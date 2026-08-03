import { readFileSync } from "node:fs";

const readSecretFile = (path) => {
  return readFileSync(path, "utf8").trim();
};

export const loadDockerSecrets = () => {
  if (process.env.JWT_SECRET_FILE && !process.env.JWT_SECRET) {
    process.env.JWT_SECRET = readSecretFile(process.env.JWT_SECRET_FILE);
  }

  if (process.env.MONGODB_PASSWORD_FILE && !process.env.MONGODB_PASSWORD) {
    process.env.MONGODB_PASSWORD = readSecretFile(process.env.MONGODB_PASSWORD_FILE);
  }

  if (!process.env.MONGODB_URI && process.env.MONGODB_PASSWORD) {
    const username = encodeURIComponent(process.env.MONGODB_USERNAME ?? "inclusive_hire");
    const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
    const database = encodeURIComponent(process.env.MONGODB_DATABASE ?? "inclusive_hire");

    process.env.MONGODB_URI = `mongodb://${username}:${password}@mongodb:27017/${database}?authSource=admin`;
  }
};
