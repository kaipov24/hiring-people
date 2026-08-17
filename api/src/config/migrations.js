import mongoose from "mongoose";

const collectionExists = async (db, name) => {
  const collections = await db.listCollections({ name }).toArray();
  return collections.length > 0;
};

const mergeLegacyCompanies = async (db) => {
  const hasCompanies = await collectionExists(db, "companies");
  if (!hasCompanies) return;

  const hasRecruiters = await collectionExists(db, "recruiters");

  if (!hasRecruiters) {
    await db.collection("companies").rename("recruiters");
    return;
  }

  const legacyCompanies = await db.collection("companies").find({}).toArray();
  for (const company of legacyCompanies) {
    await db.collection("recruiters").updateOne(
      { _id: company._id },
      { $setOnInsert: company },
      { upsert: true }
    );
  }

  await db.collection("companies").drop();
};

const renameReferenceField = async (db, collectionName) => {
  const exists = await collectionExists(db, collectionName);
  if (!exists) return;

  await db.collection(collectionName).updateMany(
    {
      company: { $exists: true },
      recruiter: { $exists: false }
    },
    [
      { $set: { recruiter: "$company" } },
      { $unset: "company" }
    ]
  );

  await db.collection(collectionName).updateMany(
    {
      company: { $exists: true },
      recruiter: { $exists: true }
    },
    { $unset: { company: "" } }
  );
};

const dropLegacyCompanyIndexes = async (db, collectionName) => {
  const exists = await collectionExists(db, collectionName);
  if (!exists) return;

  const indexes = await db.collection(collectionName).indexes();
  const legacyIndexes = indexes.filter((index) => Object.hasOwn(index.key, "company"));

  for (const index of legacyIndexes) {
    await db.collection(collectionName).dropIndex(index.name);
  }
};

export const runMigrations = async () => {
  const db = mongoose.connection.db;

  await mergeLegacyCompanies(db);
  await renameReferenceField(db, "profileviews");
  await renameReferenceField(db, "candidatestatuses");
  await dropLegacyCompanyIndexes(db, "profileviews");
  await dropLegacyCompanyIndexes(db, "candidatestatuses");
};
