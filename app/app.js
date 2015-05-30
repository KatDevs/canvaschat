let express = require('express')
let morgan = require('morgan')
let cookieParser = require('cookie-parser')
let bodyParser = require('body-parser')
let path = require('path')
let routes = require('./routes/routes')
let Server = require('http').Server
let browserify = require('browserify-middleware')

require('songbird')

class App {

	constructor () {
		let app = this.app = express()
		this.port = process.env.PORT || 8000

		app.use(morgan('dev'))
		app.use(cookieParser('ilovethenodejs'))
		app.use(bodyParser.json())
		app.use(bodyParser.urlencoded({extended : true }))

		app.set('views', path.join(__dirname, 'views'))
		app.set('view engine', 'ejs')
		
		routes(this.app)
		browserify.settings({transform: ['babelify']})
        app.use('/js/index.js', browserify('./public/js/index.js'))

		this.server = Server(app)

	}

	async initialize(port) {
		await this.server.promise.listen(port)
		return this
	}
}

module.exports = App