// loading gulpconfig.json file
const {
  DEV_MODE, // 'development' or 'production'
  PATHS,
  cssSprites,
  distIgnore, // Files to be ignored while building the dist folder
  devDistIgnore, // Files to be ignored while building the devdist folder
  BROWSER_ENV, // specifies weather you are developing a static site or a site host on your localhost
  browserSyncOptions,
  watchFiles,
} = require("./gulpconfig.json");

// setting mode for our autoprefixer package
const autoPrefixerMode = DEV_MODE ? "development" : "production";

const gulp = require("gulp");
const plumber = require("gulp-plumber");
const sass = require("gulp-sass");
const autoPrefixer = require("gulp-autoprefixer");
const gulpIf = require("gulp-if");
const cleanCSS = require("gulp-clean-css");
const rename = require("gulp-rename");
const concat = require("gulp-concat");
const webpack = require("webpack");
const gulpWebpack = require("webpack-stream");
const terser = require("gulp-terser-js");
const imageMin = require("gulp-imagemin");
const spritesmith = require("gulp.spritesmith");
const buffer = require("vinyl-buffer");
const merge = require("merge-stream");
const del = require("del");
const browserSync = require("browser-sync").create();
const sourceMaps = require("gulp-sourcemaps");

// Vendors SCSS Compilation
// Run: gulp vendorsscss
gulp.task("vendorsscss", function () {
  return gulp
    .src(PATHS.src.scss + "/vendors.scss")
    .pipe(
      plumber({
        errorHandler: function (err) {
          console.log(err);
          this.emit("end");
        },
      })
    )
    .pipe(sass({ errLogToConsole: true }))
    .pipe(
      autoPrefixer({
        env: autoPrefixerMode,
        grid: "autoplace", // should Autoprefixer add IE 10-11 prefixes for Grid Layout properties? false | autoplace | no-autoplace
      })
    )
    .pipe(gulp.dest(PATHS.assets.css));
});

// SCSS Compilation
// Run: gulp scss
gulp.task("scss", function () {
  return gulp
    .src(PATHS.src.scss + "/style.scss")
    .pipe(
      plumber({
        errorHandler: function (err) {
          console.log(err);
          this.emit("end");
        },
      })
    )
    .pipe(gulpIf(DEV_MODE, sourceMaps.init({ loadMaps: true })))
    .pipe(sass({ errLogToConsole: true }))
    .pipe(
      autoPrefixer({
        env: autoPrefixerMode,
        grid: "autoplace", // should Autoprefixer add IE 10-11 prefixes for Grid Layout properties? false | autoplace | no-autoplace
      })
    )
    .pipe(gulpIf(DEV_MODE, sourceMaps.write("./maps")))
    .pipe(gulp.dest(PATHS.assets.css));
});

// Run: gulp minifycss
// Minifies all the CSS files within ./assets/css folder
gulp.task("minifycss", function () {
  return gulp
    .src(PATHS.assets.css + "/*.css", {
      ignore: PATHS.assets.css + "/*.min.css",
    })
    .pipe(gulpIf(DEV_MODE, sourceMaps.init({ loadMaps: true })))
    .pipe(cleanCSS({ compatibility: "*" }))
    .pipe(
      plumber({
        errorHandler: function (err) {
          console.log(err);
          this.emit("end");
        },
      })
    )
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulpIf(DEV_MODE, sourceMaps.write("./maps")))
    .pipe(gulp.dest(PATHS.assets.css));
});

// Run:  gulp vendorjs
// COPIES JS FROM /src/vendors to assets/js
// Creates a concatenated vendors.js file for production mode i.e. if MODE_DEV is false.
gulp.task("vendorjs", function () {
  var scripts = [
    //  the order of the scripts matter when vendors.js is created in production mode. Manage dependencies in top to bottom order.

    // JQuery
    PATHS.src.js + "/vendors/jquery/jquery.slim.min.js",
    // Bootstrap JS
    PATHS.src.js + "/vendors/bootstrap/bootstrap.bundle.js",
    // Root Files in the vendors folder are automatically picked and processed
    PATHS.src.js + "/vendors/*.js",
  ];

  return gulp
    .src(scripts)
    .pipe(
      plumber({
        errorHandler: function (err) {
          console.log(err);
          this.emit("end");
        },
      })
    )
    .pipe(gulpIf(!DEV_MODE, concat("vendors.js")))
    .pipe(gulp.dest(PATHS.assets.js));
});

// Run:  gulp script
// bundles the /src/js/scripts.js file via Webpack
gulp.task("script", function () {
  return gulp
    .src(PATHS.src.js + "/scripts.js")
    .pipe(
      gulpWebpack(require("./webpack.config.js"), webpack, function (
        err,
        stats
      ) {
        console.log(err);
      })
    )
    .pipe(gulpIf(DEV_MODE, sourceMaps.init({ loadMaps: true })))
    .pipe(gulpIf(DEV_MODE, sourceMaps.write("./maps")))
    .pipe(gulp.dest(PATHS.assets.js));
});

// Run: gulp minifyjs
// Minifies JS files within ./assets/js folder
gulp.task("minifyjs", function () {
  return gulp
    .src(PATHS.assets.js + "/*.js", {
      ignore: PATHS.assets.js + "/*.min.js",
    })
    .pipe(
      plumber({
        errorHandler: function (err) {
          console.log(err);
          this.emit("end");
        },
      })
    )
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulpIf(DEV_MODE, sourceMaps.init({ loadMaps: true })))
    .pipe(
      terser({
        mangle: {
          toplevel: true,
        },
        sourceMap: {
          content: true,
        },
        output: {
          comments: false,
        },
      })
    )
    .on("error", function (error) {
      this.emit("end");
    })
    .pipe(gulpIf(DEV_MODE, sourceMaps.write("./maps")))
    .pipe(gulp.dest(PATHS.assets.js));
});

// Run: gulp imagemin
// Running image optimizing task
gulp.task("imagemin", function () {
  return gulp
    .src(PATHS.src.images + "/**")
    .pipe(
      imageMin(
        [
          imageMin.gifsicle({ interlaced: true }),
          imageMin.mozjpeg({ quality: 75 }),
          imageMin.optipng({ optimizationLevel: 5 }),
          imageMin.svgo({
            plugins: [{ removeViewBox: true }, { cleanupIDs: false }],
          }),
        ],
        {
          //   verbose: true,  // uncomment to see the output of compression stats in the console
        }
      )
    )
    .pipe(gulp.dest(PATHS.assets.images));
});

// Run: gulp sprites
// Creates CSS Sprite Image & SCSS file
gulp.task("sprite", function () {
  var spriteOptions = {
    imgName: "sprite.png",
    cssName: "_sprite.scss",
    imgPath: PATHS.src.images + "/sprite.png",
    algorithm: "binary-tree", //For options: https://www.npmjs.com/package/spritesmith#algorithms
  };

  //   if true then stripe_images folder should contain equal number of perfectly sized @2x images as well.
  if (cssSprites.retina === true) {
    spriteOptions = {
      ...spriteOptions,
      retinaSrcFilter: PATHS.src.sprites + "/*@2x.png",
      retinaImgName: "sprite@2x.png",
      retinaImgPath: PATHS.src.images + "/sprite@2x.png",
    };
  }

  var spriteData = gulp
    .src(PATHS.src.sprites + "/*.png")
    .pipe(spritesmith(spriteOptions));

  var imgStream = spriteData.img
    .pipe(buffer())
    .pipe(gulp.dest(PATHS.src.images));

  // Pipe CSS stream through CSS optimizer and onto disk
  var cssStream = spriteData.css.pipe(
    gulp.dest(PATHS.src.scss + "/components/")
  );

  // Return a merged stream to handle both `end` events
  return merge(imgStream, cssStream);
});

// Run:  gulp copy-assets.
// Copy all needed dependency assets files from node_modules folder to src/js, src/scss folders
gulp.task("copy-assets", function () {
  // Copy Slim Minified version of Jquery 3.*.* from node_modules
  var stream = gulp
    .src(PATHS.node + "jquery/dist/*.js")
    .pipe(gulp.dest(PATHS.src.js + "/vendors/jquery"));

  // Copy BS4 JS files
  gulp
    .src(PATHS.node + "bootstrap/dist/js/**/*.js")
    .pipe(gulp.dest(PATHS.src.js + "/vendors/bootstrap"));

  // Copy BS4 SCSS files
  gulp
    .src(PATHS.node + "bootstrap/scss/**/*.scss")
    .pipe(gulp.dest(PATHS.src.scss + "/vendors/bootstrap"));

  // Copy all Font Awesome Fonts
  gulp
    .src(
      PATHS.node +
        "@fortawesome/fontawesome-free/webfonts/*.{ttf,woff,woff2,eot,svg}"
    )
    .pipe(gulp.dest(PATHS.src.fonts));

  // Copy all FontAwesome5 Free SCSS files
  gulp
    .src(PATHS.node + "@fortawesome/fontawesome-free/scss/*.scss")
    .pipe(gulp.dest(PATHS.src.scss + "/vendors/fontawesome"));

  return stream;
});

gulp.task("webfonts", function () {
  return gulp
    .src(PATHS.src.fonts + "/**/*")
    .pipe(gulp.dest(PATHS.assets.fonts));
});

// Deleting any file inside the /dist folder
gulp.task("cleandist", function () {
  return del([PATHS.dist]);
});

// Run: gulp build
// Copies the files to the /dist folder for distribution of end product
gulp.task(
  "build",
  gulp.series("cleandist", function () {
    return gulp
      .src(["**/*", "*"], { ignore: distIgnore, buffer: true, dot: true })
      .pipe(gulp.dest(PATHS.dist));
  })
);

// Deleting any file inside the /dev-dist folder.
gulp.task("cleandevdist", function () {
  return del([PATHS.devdist]);
});

// Run: gulp devdist
// Copies the files to the /dev-dist folder for distribution of template for development
gulp.task(
  "devdist",
  gulp.series("cleandevdist", function () {
    return gulp
      .src(["**/*", "*"], { ignore: devDistIgnore, buffer: true, dot: true })
      .pipe(gulp.dest(PATHS.devdist));
  })
);

// Run: gulp browsersync
// Starts browser-sync task for starting the server.
gulp.task("browsersync", function (done) {
  browserSync.init({}, browserSyncOptions[BROWSER_ENV]);
  done();
});

const reloadBrowser = (done) => {
  browserSync.reload();
  done();
};

// Run: gulp watch-assets
// Watches for changes in style.scss, _template_variables.scss, *js files and images within src folder
gulp.task("watch-assets", function () {
  const watcherOptions = {};

  // Watches for SCSS file changes
  if (watchFiles.scss === true) {
    gulp.watch(
      [PATHS.src.scss + "/vendors/**/*.scss", PATHS.src.scss + "/vendors.scss"],
      gulp.series("vendorsscss", reloadBrowser)
    );

    gulp.watch(
      PATHS.src.scss + "/**/*.scss",
      {
        ignored: [
          PATHS.src.scss + "/vendors/**/*.scss",
          PATHS.src.scss + "/vendors.scss",
        ],
      },
      gulp.series("scss", reloadBrowser)
    );
  }

  // Watches for JS file changes inside ./src
  if (watchFiles.js === true) {
    gulp.watch(
      PATHS.src.js + "/vendors/**/*.js",
      gulp.series("vendorjs", reloadBrowser)
    );
    gulp.watch(PATHS.src.js + "/**/*.js", gulp.series("script", reloadBrowser));
  }

  // Watches for Images file changes inside ./src
  if (watchFiles.images === true) {
    gulp.watch(PATHS.src.images + "/*", gulp.series("imagemin", reloadBrowser));
  }

  // Watches for sprite_images folder changes inside ./src
  // Sprite generation will in-turn call SCSS and Images watcher and hence reload the browser as a side-effect
  if (watchFiles.sprites === true) {
    gulp.watch(PATHS.src.sprites + "/*", gulp.series("sprite"));
  }

  // Watches for CSS file changes inside ./assets
  if (watchFiles.assetsCss === true) {
    gulp.watch(PATHS.assets.css + "/**/*.css", gulp.series(reloadBrowser));
  }

  // Watches for JS file changes inside ./assets
  if (watchFiles.assetsJs === true) {
    gulp.watch(PATHS.assets.js + "/**/*.js", gulp.series(reloadBrowser));
  }

  // Watches for images file changes inside ./assets
  if (watchFiles.assetsImg === true) {
    gulp.watch(PATHS.assets.images + "/*", gulp.series(reloadBrowser));
  }
});

// Run: gulp serve
// serves the application and watching for changes in scss, js, images inside src folder
gulp.task(
  "serve",
  gulp.series(
    gulp.parallel(
      "scss",
      "vendorsscss",
      "webfonts",
      "vendorjs",
      "script",
      "imagemin",
      "sprite"
    ),
    "browsersync",
    "watch-assets"
  )
);
