let $ = require('jquery')

$('#navTab a').click((e) => {
	console.log("clicked")
	e.preventDefault()
	$(this).tab('show')
})
