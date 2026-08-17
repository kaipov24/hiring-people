import mongoose from "mongoose";

const statuses = ["Viewed", "Contacted", "Hired"];

const candidateStatusSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: statuses,
      required: true,
      index: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

candidateStatusSchema.index({ candidate: 1, recruiter: 1 }, { unique: true });

export const CandidateStatus = mongoose.model("CandidateStatus", candidateStatusSchema);
export { statuses as candidateStatuses };
