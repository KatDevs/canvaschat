let mongoose = require('mongoose')
let bcrypt = require('bcrypt')

let userSchema = mongoose.Schema({
    local: {
       email:String,
       password: String,
       firstName: String,
       lastName: String
    },
    facebook: {
      id: String,
      token: String,
      email: String,
      name: String
    }
})

userSchema.methods.generateHash = async function(password) {
    return await bcrypt.promise.hash(password, 8)
}

userSchema.methods.validatePassword = async function(password) {
    return await bcrypt.promise.compare(password, this.local.password)
}

userSchema.methods.linkAccount = function(type, values) {
  return this['link'+_.capitalize(type)+'Account'](values)
}

userSchema.methods.unlinkAccount = function(type) {
  throw new Error('Not Implemented.')
}

module.exports = mongoose.model('User', userSchema)