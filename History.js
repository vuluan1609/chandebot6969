const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    serverKey: { type: String, default: 'global', unique: true },
    results: { type: Array, default: [] } // Mảng chứa kết quả: ['tai', 'xiu', 'tai', ...]
});

module.exports = mongoose.model('History', historySchema);