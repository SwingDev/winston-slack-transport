const gulp = require('gulp');
const gutil = require('gulp-util');
const coffee = require('gulp-coffee');
const watch = require('gulp-watch');
const merge = require('merge-stream');
const coffeelint = require('gulp-coffeelint');
const plumber = require('gulp-plumber');
const del = require('del');
const sourcemaps = require('gulp-sourcemaps');
const glob = require('glob');

const onError = function (err) {
  gutil.beep();
  gutil.log(err);
};


gulp.task("clean", () => {
  return del('lib');
});

gulp.task('compile_src', () => {
  return merge(
    gulp.src('./src/**/*.coffee')
      .pipe(plumber({errorHandler: onError}))
      .pipe(coffeelint())
      .pipe(coffeelint.reporter())
      .pipe(sourcemaps.init())
      .pipe(coffee({bare: true}))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('./')),
    gulp.src(['./src/**/*', '!./src/**/*.coffee'])
      .pipe(plumber({errorHandler: onError}))
      .pipe(gulp.dest('./')))
});

gulp.task('compile', gulp.series('clean', 'compile_src', (done) => {
    done();
  })
);

gulp.task("watch", function () {
  watch(glob.sync('src/**/*.coffee'), function (files, cb) {
    gulp.start('compile_src', cb);
  });
});

