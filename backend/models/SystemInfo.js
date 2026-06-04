const mongoose = require('mongoose');

const SystemInfoSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now }
});

const SystemInfo = mongoose.model('SystemInfo', SystemInfoSchema);

module.exports = SystemInfo;