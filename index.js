let express = require('express')
let morgan = require('morgan')

const NODE_ENV = process.env.NODE_ENV || 'development'

let app = express(),
  port = process.env.PORT || 8000

app.use(morgan('dev'))

app.listen(port, () => console.log(`Listening @ http://127.0.0.1:${port}`))
