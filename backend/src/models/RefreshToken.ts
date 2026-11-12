import { Schema, model, Document } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Schema.Types.ObjectId | string;
  tokenHash: string; // SHA-256 hash of the raw token
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index for efficient lookups
refreshTokenSchema.index({ userId: 1, revoked: 1, expiresAt: 1 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
