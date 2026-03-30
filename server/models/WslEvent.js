import mongoose from 'mongoose';

const wslEventSchema = new mongoose.Schema(
  {
    season: {
      type: String,
      required: true, // e.g. "2026"
    },
    stop: {
      type: Number,
      required: true,
    },
    event: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    dates: {
      type: String,
      required: true,
      trim: true,
    },
    tour: {
      type: String,
      default: 'CT',
      trim: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'completed'],
      default: 'upcoming',
    },
    winner: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

wslEventSchema.index({ season: 1, stop: 1 }, { unique: true });

const WslEvent = mongoose.model('WslEvent', wslEventSchema);
export default WslEvent;
