var gulp = require("gulp");

gulp.task("copy-vendor-files",function(){
	// copy materialize	
	gulp.src("bower_components/materialize/dist/**/**")
		.pipe(gulp.dest("public/vendor/materialize"));

	// copy jquery	
	gulp.src("bower_components/jquery/dist/**")
		.pipe(gulp.dest("public/vendor/jquery"));
});

gulp.task("default", ["copy-vendor-files"]);

module.exports = gulp;