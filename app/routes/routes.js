let isLoggedIn = require('../middlewares/isLoggedIn')
let FB = require('fb')
let _ = require('lodash')
let then = require('express-then')
let Promise = require('promise');
let UserCanvas = require('../models/usercanvas')

let networks = {  
  facebook: {
      icon: 'facebook',
      name: 'Facebook',
      class: 'btn-primary'
  }
}

module.exports = (app) => {
	let passport = app.passport
	let facebookConfig = app.config.auth.facebook

    FB.options({
        appId:          facebookConfig.consumerKey,
        appSecret:      facebookConfig.consumerSecret,
        redirectUri:    facebookConfig.callbackUrl
    });
	
	app.get('/', (req, res) => {
		res.render('index.ejs', {message: req.flash('error')})
	})

	app.get('/logout', (req, res) => {
	    req.logout()
	    res.redirect('/')
	})
  	
	app.post('/signin', passport.authenticate('local-login', {
		successRedirect: '/profile',
		failureRedirect: '/',
		failureFlash: true
	}))
	
	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect: '/profile',
		failureRedirect: '/',
		failureFlash: true
	}))

	app.get('/chat', isLoggedIn, then(async (req, res) => {       
		let atoken = req.user.facebook.token;    	
		FB.setAccessToken(atoken);
		let promises = [];    	    	
		promises.push(new Promise((resolve, reject) => FB.api('/me/friends', resolve)))

		let [friendsList] = await Promise.all(promises);     
		console.log(friendsList);
		let friendsListWithPic = []			
		if(friendsList && friendsList.data){      
			let userData = friendsList.data
			for(let friend of userData){
				// todo user promise all
				let profilePicObj =  await new Promise((resolve, reject) => FB.api('/' + friend.id + '/picture', {redirect:false}, resolve))
      			let profilePic = profilePicObj && profilePicObj.data ? profilePicObj.data.url : ''
				friendsListWithPic.push({
					name: friend.name,
					id: friend.id,
					pic: profilePic
				})
			}
		}
		console.log(friendsListWithPic);
		res.render('chat.ejs', {
			user: req.user,
			fbUsers: friendsListWithPic			
		})
	}))

	app.get('/profile', isLoggedIn, then(async(req, res) => {
		let savedCanvases = [];
		if(req.user.facebook) {
			let userFbId = req.user.facebook.id;
			savedCanvases = await UserCanvas.promise.find({userId: userFbId});
			console.log(savedCanvases);
		}
		res.render('profile.ejs', {
			user: req.user,
			message: req.flash('error'),
			savedCanvases: savedCanvases
		})
    }))

	app.get('/auth/facebook', passport.authenticate('facebook', {
		scope: ['email', 'user_posts', 'user_photos', 'read_stream',
		 'public_profile','user_likes', 'publish_actions']
		}))

	app.get('/auth/facebook/callback', passport.authenticate('facebook', {
	  successRedirect: '/profile',
	  failureRedirect: '/login',
	  failureFlash: true
	}))
  
	app.get('/connect/facebook', passport.authorize('facebook', {
		scope: ['email', 'user_posts', 'read_stream', 'user_photos',
		 'public_profile','user_likes', 'publish_actions']
	}))

  	app.get('/connect/facebook/callback', passport.authorize('facebook', {
      successRedirect: '/profile',
      failureRedirect: '/login',
      failureFlash: true
  	}))

    app.get('/logout', (req, res) => {
    	req.logout()
    	req.redirect('/')
    })

    app.post('/save/canvas',isLoggedIn, then(async (req, res) => {
    	console.log(req.body)
    	let userCanvas = new UserCanvas(req.body)
    	await userCanvas.save();
    	res.send();
    }));

}