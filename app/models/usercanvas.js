let mongoose = require('mongoose')

let userCanvasSchema = mongoose.Schema({
  userId: String,
  fromUser: String,
  toUser: String,
  imgUrl: String 
})


module.exports = mongoose.model('UserCanvas', userCanvasSchema)