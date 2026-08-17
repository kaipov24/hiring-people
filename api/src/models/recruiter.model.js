import mongoose from "mongoose";

const recruiterSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    website: {
      type: String,
      trim: true,
      maxlength: 300
    },
    contacts: {
      email: {
        type: String,
        trim: true,
        maxlength: 160
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 80
      },
      messenger: {
        type: String,
        trim: true,
        maxlength: 160
      }
    },
    accessibilityCommitments: {
      type: [String],
      default: []
    },
    hiredCandidateCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

recruiterSchema.index({ name: 1 });

export const Recruiter = mongoose.model("Recruiter", recruiterSchema);
