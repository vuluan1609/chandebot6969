const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },         // Tiền mặt trong ví
  bank: { type: Number, default: 0 },            // Tiền trong ngân hàng
  lastDaily: { type: Number, default: null },    // Mốc thời gian điểm danh
  lastDaily: { type: Number, default: null }, // Mốc thời gian điểm danh
  lastWork: { type: Number, default: 0 },     // Thêm dòng này để lưu mốc thời gian work
  streak: { type: Number, default: 0 },          // Chuỗi ngày điểm danh
  marriedTo: { type: String, default: null },    // ID người kết hôn
  inventory: { type: [String], default: [] },    // Túi đồ (mã nhẫn)
  debts: [                                       // Sổ nợ P2P
    {
      lenderId: String,
      borrowerId: String,
      amount: Number
    }
  ],
  lastInterestTime: { type: Number, default: Date.now() } // Mốc thời gian tính lãi ngân hàng
});

module.exports = mongoose.model('User', userSchema);