let requireDir = require('require-dir')
let App = require('./app/app')

const NODE_ENV = process.env.NODE_ENV || 'development'

let config = requireDir('./config', {rescue: true})

let app = new App(),
  port = process.env.PORT || 8000

app.initialize(port)
	.then(() => console.log(`Listening @ http://127.0.0.1:${port}`))
	.catch(e => console.log(e.stack ? e.stack : e))
