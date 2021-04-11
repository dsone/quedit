const gulp = require('gulp');
const rename = require('gulp-rename');
const uglifycss = require('gulp-uglifycss');

const tap = require('gulp-tap');
const babelify = require('babelify');
const buffer = require('gulp-buffer');
const uglify = require('gulp-uglify');
const browserify = require('browserify');

const purgeCss = require('@fullhuman/postcss-purgecss')({
	// Specify the paths to all of the template files in your project 
	content: [
	  './www/**/*.html',
	  './www/dist/js/*.js',
	],
	// Include any special characters you're using in this regular expression
	defaultExtractor: content => content.match(/[A-Za-z0-9-_:/]+/g) || []
});

gulp.task('sass', function () {
	const postcss = require('gulp-postcss')
	
	return gulp.src('src/scss/app.scss')
			   .pipe(rename({ extname: ".css" }))
			   .pipe(postcss([
					require('postcss-import'),
					require('tailwindcss'),
					require('postcss-nested'),
					require('postcss-custom-properties'),
					require('autoprefixer'),
					purgeCss
				]))
				.pipe(uglifycss({
					"maxLineLen": 80,
					"uglyComments": true
				}))
				.pipe(gulp.dest('www/dist/'));
});

gulp.task('sass:watch', function () {
	gulp.watch([ 'src/scss/**/*.scss', './www/**/*.html' ],  { interval: 1000, usePolling: true }, gulp.series('sass'));
});

gulp.task('js', function() {
	return gulp.src('src/js/*.js', { read: false, base: './src/js' })
			   .pipe(tap(function(file) {
					file.contents = browserify({
						entries: file.path,
						debug: true
					})
					.transform(babelify)
					.bundle();
				}))
				.pipe(buffer())
				.pipe(uglify())
				.pipe(gulp.dest('www/dist/'));
});

gulp.task('js:watch', function () {
    return gulp.watch('src/js/**/*.js',  { interval: 1000, usePolling: true }, gulp.series('js'));
});

gulp.task('watch', function () {
    gulp.watch([ './src/scss/**/*.scss', './www/**/*.html' ],  { interval: 1000, usePolling: true }, gulp.series('sass'));
	gulp.watch('./src/js/**/*.js',  { interval: 1000, usePolling: true }, gulp.series('js'));
});