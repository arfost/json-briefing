var spawn = require('child_process').spawn;
const gulp = require('gulp');

const filesList = ['index.js','analyst.js','scout.js', 'genericUtils.js', 'package.json', 'readme.md']


gulp.task('npm-publish', function (done) {
    spawn('npm', ['publish'], { stdio: 'inherit' }).on('close', done);
});

gulp.task('build', function () {
    gulp.src(filesList)
        .pipe(gulp.dest('build/'));
});