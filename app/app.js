let express = require('express')
let morgan = require('morgan')
let cookieParser = require('cookie-parser')
let bodyParser = require('body-parser')
let path = require('path')
let routes = require('./routes/routes')
let Server = require('http').Server
let browserify = require('browserify-middleware')
let session = require('express-session')
let MongoStore = require('connect-mongo')(session)
let mongoose = require('mongoose')
let flash = require('connect-flash')

require('songbird')

let passportMiddleWare = require('./middlewares/passport')
const NODE_ENV = process.env.NODE_ENV || 'development'

class App {

	constructor (config) {
		let app = this.app = express()
		this.port = process.env.PORT || 8000

		app.config = {
			auth: config.auth[NODE_ENV],
			database: config.database[NODE_ENV]
		}

		// configure passport
		passportMiddleWare.configure(config.auth[NODE_ENV])
		app.passport = passportMiddleWare.passport

		// connect database
		mongoose.connect(config.database[NODE_ENV].url)

		// configure other middleware
		app.use(morgan('dev'))
		app.use(cookieParser('canvas-chat-session'))
		app.use(bodyParser.json())
		app.use(bodyParser.urlencoded({extended : true }))

		app.set('views', path.join(__dirname, '..', 'views'))
		app.set('view engine', 'ejs')

		app.use(session({
			secret: 'canvas-chat-session',
			store: new MongoStore({db:'canvas-chat'}),
			resave: true,
			saveUninitialized: true
		}))
		
		// Setup passport authentication middleware
		app.use(app.passport.initialize())
		// persistent login sessions
		app.use(app.passport.session())
		// Flash messages stored in session
		app.use(flash())
		
		routes(this.app)

		// browserify client scripts
		browserify.settings({transform: ['babelify']})
        app.use(express.static('public'));

        // TODO find a way to bundle all files together
        // login/main.js
        app.use('/login/main.js', browserify('./public/js/login/main.js'))
        // TODO: profile/main.js
        app.use('/profile/main.js', browserify('./public/js/profile/main.js'))
        // TODO: chatroom/main.js

		this.server = Server(app)

	}

	async initialize(port) {
		await this.server.promise.listen(port)
		return this
	}
}

module.exports = App