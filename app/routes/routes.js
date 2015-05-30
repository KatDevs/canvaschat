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
}