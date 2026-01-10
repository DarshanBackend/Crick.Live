import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  couponImage: {
    type: String,
    default: null
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  description2: {
    type: String,
    trim: true,
    default: ""
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountType: {
    type: String,
    required: true,
    enum: ["flat", "percentage"],
    default: "percentage"
  },
  flatValue: {
    type: Number,
    default: 0,
    min: 0
  },
  percentageValue: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  planName: {
    type: String,
    default: null,
    required: false,
    validate: {
      validator: function(value) {
        if (!value || value === null || value === '') return true;
        return ["Single Match", "Monthly", "Quarterly", "Annual Plan"].includes(value);
      },
      message: 'Plan name must be one of: Single Match, Monthly, Quarterly, Annual Plan, or null'
    }
  },
  expiryDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

couponSchema.pre('save', function () {
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.isActive = false;
  }
});

couponSchema.statics.isValidCoupon = async function (code) {
  const coupon = await this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    expiryDate: { $gt: new Date() }
  });
  return coupon;
};

const couponModel = mongoose.model("coupon", couponSchema);

export default couponModel;
