let isLoggedIn = require('../middlewares/isLoggedIn')

let networks = {  
  facebook: {
      icon: 'facebook',
      name: 'Facebook',
      class: 'btn-primary'
  }
}

module.exports = (app) => {
	let passport = app.passport
	
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

	app.get('/profile', isLoggedIn, (req, res) => {
        res.render('profile.ejs', {
            user: req.user,
            message: req.flash('error')
        })
    })

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
}