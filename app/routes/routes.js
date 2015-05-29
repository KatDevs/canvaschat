module.exports = (app) => {
	app.get('/', (req, res) => res.render('../../views/index.ejs'))
}