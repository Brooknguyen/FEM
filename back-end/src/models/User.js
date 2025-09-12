import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true }, // Employee code
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
