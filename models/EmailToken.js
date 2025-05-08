const mongoose = require('mongoose')
const Schema = mongoose.Schema

const EmailTokenSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    token: {type: String, required: true},
    createdAt: {type: Date, default: Date.now(), expires: '1h'}
})

module.exports = mongoose.model("EmailToken", EmailTokenSchema)