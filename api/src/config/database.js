import mongoose from "mongoose";

export const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to connect to MongoDB");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri, {
    autoIndex: process.env.NODE_ENV !== "production"
  });
};

export const disconnectDatabase = async () => {
  await mongoose.disconnect();
};
