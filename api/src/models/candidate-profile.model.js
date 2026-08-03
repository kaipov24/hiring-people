import mongoose from "mongoose";

const candidateProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 160
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 3000
    },
    skills: {
      type: [String],
      default: [],
      index: true
    },
    languages: {
      type: [String],
      default: [],
      index: true
    },
    accessibilityPreferences: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    location: {
      type: String,
      trim: true,
      maxlength: 160
    },
    cv: {
      filename: String,
      originalName: String,
      mimeType: String,
      size: Number,
      uploadedAt: Date
    }
  },
  {
    timestamps: true
  }
);

candidateProfileSchema.index({ headline: "text", summary: "text", skills: "text", languages: "text" });

export const CandidateProfile = mongoose.model("CandidateProfile", candidateProfileSchema);
