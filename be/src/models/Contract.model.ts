import mongoose, { Schema, Document, Types } from "mongoose";

export interface IContract extends Document {
  title: string;
  description: string;

  price: number;
  deposit: number;

  status: string;

  farmerId: Types.ObjectId;
  businessId: Types.ObjectId;
  createdBy: Types.ObjectId;

  startDate: Date;
  endDate: Date;

  location: string;

  products: any[];
  milestones: any[];
  payments: any[];

  rating: number;
  feedback: string;

  isDeleted: boolean;
  version: number;

  auditLogs: any[];

  createdAt: Date;
  updatedAt: Date;
}

/* ======================
   SUB SCHEMAS
====================== */

const ProductSchema = new Schema({
  name: String,
  quantity: Number,
  unit: String,
  price: Number,
});

const MilestoneSchema = new Schema({
  title: String,
  description: String,
  dueDate: Date,
  isDone: Boolean,
});

const PaymentSchema = new Schema({
  amount: Number,
  method: String,
  status: String,
  paidAt: Date,
});

const AuditSchema = new Schema({
  action: String,
  by: Schema.Types.ObjectId,
  oldValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed,
  createdAt: Date,
});

/* ======================
   MAIN SCHEMA
====================== */

const ContractSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    price: { type: Number, required: true },
    deposit: { type: Number, default: 0 },

    status: {
      type: String,
      default: "pending",
      enum: [
        "pending",
        "accepted",
        "rejected",
        "in_progress",
        "completed",
        "cancelled",
        "disputed",
      ],
    },

    farmerId: { type: Schema.Types.ObjectId, ref: "User" },
    businessId: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },

    startDate: Date,
    endDate: Date,

    location: String,

    products: [ProductSchema],
    milestones: [MilestoneSchema],
    payments: [PaymentSchema],

    rating: Number,
    feedback: String,

    isDeleted: { type: Boolean, default: false },
    version: { type: Number, default: 1 },

    auditLogs: [AuditSchema],
  },
  { timestamps: true }
);

/* ======================
   INDEXES
====================== */
ContractSchema.index({ status: 1 });
ContractSchema.index({ farmerId: 1 });
ContractSchema.index({ businessId: 1 });
ContractSchema.index({ createdAt: -1 });

/* ======================
   VIRTUALS
====================== */
ContractSchema.virtual("isActive").get(function () {
  return this.status === "in_progress";
});

/* ======================
   HOOKS (heavy style)
====================== */
ContractSchema.pre("save", function (next) {
  this.version += 1;
  next();
});

export default mongoose.model<IContract>("Contract", ContractSchema);