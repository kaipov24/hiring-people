import mongoose from "mongoose";

const roles = ["candidate", "hiring_manager"];

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
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model("User", userSchema);
export { roles as userRoles };
