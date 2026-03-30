import mongoose from 'mongoose';

const surferSchema = new mongoose.Schema(
  {
    rank: {
      type: mongoose.Schema.Types.Mixed, // Number or "WC" for wildcards
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    countryFlag: {
      type: String,
      default: '',
    },
    points: {
      type: String,
      default: '',
    },
  },
  { _id: false },
);

const wslRankingSchema = new mongoose.Schema(
  {
    season: {
      type: String,
      required: true, // e.g. "2026"
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required: true,
    },
    surfers: [surferSchema],
    lastUpdated: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

// Um ranking por season + gender
wslRankingSchema.index({ season: 1, gender: 1 }, { unique: true });

const WslRanking = mongoose.model('WslRanking', wslRankingSchema);
export default WslRanking;
