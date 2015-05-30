let passport = require('passport')
let LocalStrategy = require('passport-local').Strategy
let FacebookStrategy = require('passport-facebook').Strategy
let nodeifyit = require('nodeifyit')
let User = require('../models/user')
let _ = require('lodash')

require('songbird')

function useExternalPassportStrategy(OauthStrategy, config, field) {
  config.passReqToCallback = true
  passport.use(new OauthStrategy(config, nodeifyit(authCB, {spread: true})))
  let socialNetworkType = field;
  async function authCB(req, token, _ignored_, account) {
      if(!account) {
        throw Error("Invalid account");  
      }     
      let userId  = account.id;
      let query = {};

      if(socialNetworkType === 'facebook'){
        query['facebook.id'] = userId  
      } else {
        throw Error('Invalid Social Network type')
      }
      
      let user
      // if req exists and user is loggedin
      if(req && req.user) {
        user = req.user
      }else{
        user = await User.promise.findOne(query)
        if(!user) {
          user = new User({})
        }
      }
      
      if(socialNetworkType === 'facebook'){        
        let email = !_.isEmpty(account.emails) ? account.emails[0].value : "not found"         
        user.facebook =  {
            id: userId,
            token: token,
            secret: _ignored_,
            email: email, 
            name: account.displayName
          };
      }      
      return await user.save()
  }
}

function configure(config) {
  // serialize and deserialize section
  passport.serializeUser(nodeifyit(async(user) => user.id))
  passport.deserializeUser(nodeifyit(async(id) => {
      return await User.promise.findById(id)
  }))

  // facebook strategy
  useExternalPassportStrategy(FacebookStrategy, {
        clientID: config.facebook.consumerKey,
        clientSecret: config.facebook.consumerSecret,
        callbackURL: config.facebook.callbackUrl
    }, 'facebook')
  
  // Local login
  passport.use('local-login', new LocalStrategy({
    // Use "email" field instead of "username"
    usernameField: 'email',
    failureFlash: true
  }, nodeifyit(async (email, password) => {
    let user    
    user = await User.promise.findOne({
      'local.email': email
    })
    console.log(user); 
    if(!user || user.local.email !== email) {
      return [false, {message: 'Invalid username'}]
    }  
    
    if(!await user.validatePassword(password)) {
      return [false, {message: 'Invalid password'}]
    }  
    return user
  }, {spread: true})))

  // Local sign up  
  passport.use('local-signup', new LocalStrategy({
    // Use "email" field instead of "username"
    usernameField: 'email',
    failureFlash: true,
    passReqToCallback: true
  }, nodeifyit(async (req, email, password) => {        
      email = (email || '').toLowerCase()
      let currUser = await User.promise.findOne({'local.email': email})

      if(currUser) {
        return [false, {message: 'User already exists'}]
      }

      // create the user
      let user = new User({
        local: {}
      })

      console.log(req.body);
      user.local.email = email
      user.local.password = await user.generateHash(password)
      user.local.userName = email
      user.local.firstName = req.body.firstName
      user.local.lastName = re.body.lastName
      
      try{
        let result = await user.save()
        return result;
      }catch(e) {
        return [false, {message: e.message}]
      }
  }, {spread: true})))
  
  

  return passport
}

module.exports = {passport, configure}