const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  metricType: {
    type: String,
    required: true,
    enum: ['page_view', 'ticket_sale', 'revenue', 'user_registration', 'match_view', 'search']
  },
  value: {
    type: Number,
    required: true,
    default: 1
  },
  dimensions: {
    type: Object,
    default: {}
  },
  metadata: {
    type: Object,
    default: {}
  },
  sessionId: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ipAddress: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'analytics'
});

// Indexes for efficient time-series queries
AnalyticsSchema.index({ metricType: 1, timestamp: -1 });
AnalyticsSchema.index({ userId: 1, timestamp: -1 });
AnalyticsSchema.index({ 'dimensions.matchId': 1, timestamp: -1 });

// TTL index - keep data for 90 days
AnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const Analytics = mongoose.model('Analytics', AnalyticsSchema);

module.exports = Analytics;