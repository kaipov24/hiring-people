import mongoose from "mongoose";

const roles = ["candidate", "hiring_manager", "admin"];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: roles,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    emailVerified: {
      type: Boolean,
      default: true,
      index: true
    },
    emailVerificationToken: {
      type: String,
      trim: true,
      index: true
    },
    emailVerificationExpiresAt: {
      type: Date
    },
    passwordResetToken: {
      type: String,
      trim: true,
      index: true
    },
    passwordResetExpiresAt: {
      type: Date
    },
    disabledAt: {
      type: Date
    },
    disabledReason: {
      type: String,
      trim: true,
      maxlength: 300
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model("User", userSchema);
export { roles as userRoles };
