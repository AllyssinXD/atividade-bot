// models/Reply.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Reply = new Schema({
  postId: { type: Schema.Types.ObjectId, ref: "PostsPublicos", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Reply', Reply);
