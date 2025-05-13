const mongoose = require('mongoose')
const { Schema } = mongoose

const postReplySchema = new Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PostsPublicos',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const PostReply = mongoose.model('PostReply', postReplySchema)
module.exports = PostReply