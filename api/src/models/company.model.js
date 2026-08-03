import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
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

companySchema.index({ name: 1 });

export const Company = mongoose.model("Company", companySchema);
