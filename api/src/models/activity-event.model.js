import mongoose from "mongoose";

const activityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["page_view"],
      required: true,
      index: true
    },
    page: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true
    },
    visitorId: {
      type: String,
      trim: true,
      maxlength: 120,
      index: true
    },
    authenticated: {
      type: Boolean,
      default: false,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    }
  },
  {
    timestamps: true
  }
);

activityEventSchema.index({ createdAt: -1 });
activityEventSchema.index({ page: 1, authenticated: 1, createdAt: -1 });

export const ActivityEvent = mongoose.model("ActivityEvent", activityEventSchema);
