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
    specialization: {
      type: String,
      trim: true,
      maxlength: 120,
      index: true
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
    portfolio: {
      type: String,
      trim: true,
      maxlength: 300
    },
    availability: {
      type: String,
      trim: true,
      maxlength: 120
    },
    employmentFormat: {
      type: String,
      enum: ["remote", "office", "hybrid"],
      default: "remote",
      index: true
    },
    location: {
      type: String,
      trim: true,
      maxlength: 160
    },
    contacts: {
      email: {
        type: String,
        trim: true,
        maxlength: 160
      },
      messenger: {
        type: String,
        trim: true,
        maxlength: 160
      },
      messengerType: {
        type: String,
        enum: ["telegram", "whatsapp"],
        default: "telegram"
      }
    },
    cv: {
      filename: String,
      storageDriver: {
        type: String,
        enum: ["local", "r2"],
        default: "local"
      },
      storageKey: String,
      bucket: String,
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

candidateProfileSchema.index({
  headline: "text",
  specialization: "text",
  summary: "text",
  skills: "text",
  languages: "text",
  availability: "text",
  employmentFormat: "text"
});

export const CandidateProfile = mongoose.model("CandidateProfile", candidateProfileSchema);
