"use strict";

var gulp = require("gulp");
var concat = require("gulp-concat");
var rename = require("gulp-rename");
var exclude = require("gulp-ignore").exclude;
var gutil = require("gulp-util");
var File = require("vinyl");
var through = require("through2");

var spa = require("../index.js");

describe("spa", function () {
    /**
     * NB --> `sourceKind` parameter, introduced for convenience, may be _ONLY_ html OR jade
     *
     * @param {String} sourceKind
     * @param {String} name
     * @param {Object} pipelines
     */
    var basicCase = function (sourceKind, name, pipelines) {
        return function () {
            var expected = gulp.src("./test/" + sourceKind + "/expected/" + name + "/**/*")
                .pipe(exclude(function isNull (file) {
                    return file.isNull();
                }));
            var actual = gulp.src("./test/" + sourceKind + "/fixtures/" + name + "/*." + sourceKind)
                .pipe(spa[sourceKind]({
                    assetsDir: "./test/"+ sourceKind +"/fixtures/" + name,
                    pipelines: pipelines
                }));
            return actual.should.produce.sameFilesAs(expected);
        };
    };

    var createKeyValue = function (key, value) {
        var obj = {};
        obj[key] = value;
        return obj;
    };


    /**
     *  HTML pipe tests
     */
    describe(".html()", function () {
        var tagTypes = [{
            type: "css",
            tagName: "link"
        }, {

            type: "js",
            tagName: "script"
        }];

        describe("with one output file", function () {
            tagTypes.forEach(function (tagType) {
                var type = tagType.type;
                var tagName = tagType.tagName;
                var createConcat = function () {
                    return function (files) {
                        return files.pipe(concat("joined." + type));
                    };
                };

                it("should produce only one " + tagName + " tag",
                    basicCase("html", "one-" + tagName + "-tag", createKeyValue(type, createConcat())));
                it("should preserve leading slash in paths for " + tagName + " tag",
                    basicCase("html", "preserve-leading-slash-one-" + tagName + "-tag", createKeyValue(type, createConcat())));
                it("should not add leading slash to " + tagName + " tags' paths that didn't have it",
                    basicCase("html", "dont-add-leading-slash-one-" + tagName + "-tag", createKeyValue(type, createConcat())));
            });
        });

        describe("with multiple output files", function () {
            tagTypes.forEach(function (tagType) {
                var type = tagType.type;
                var tagName = tagType.tagName;

                it("should produce multiple " + tagName + " tags using original whitespace convention",
                    basicCase("html", "many-" + tagName + "-tag", {}));
                it("should preserve leading slash in paths for " + tagName + " tags",
                    basicCase("html", "preserve-leading-slash-many-" + tagName + "-tag", {}));
                it("should not add leading slash to " + tagName + " tags' paths that didn't have it",
                    basicCase("html", "dont-add-leading-slash-many-" + tagName + "-tag", {}));
            });
        });

        it("should use the pipeline titled `main` for the main file", basicCase("html", "use-pipeline-named-main", {
            main: function (files) {
                return files.pipe(rename("foo.html"));
            }
        }));

        it("should work with multiple html files", basicCase("html", "multiple-builds", {
            js: function (files) {
                return files.pipe(concat("joined.js"));
            },
            css: function (files) {
                return files.pipe(concat("joined.css"));
            }
        }));

        it("should not insert files that aren't CSS or JS", basicCase("html", "dont-insert-unknown", {}));

        it("should work with html files without any builds", basicCase("html", "no-builds", {}));

        it("should work when css files are moved to another directory", basicCase("html", "link-tags-moved-to-directory", {
            css: function (files) {
                return files.pipe(rename({ dirname: "css" }));
            }
        }));

        it("should throw an error if streaming is attempted", function () {
            var stream = spa.html();
            void function () {
                stream.write(new File({
                    path: "/foo.html",
                    contents: through.obj()
                }));
            }.should.throw("Streaming not supported");
        });

        it("should throw an error if the file has an `endbuild` instruction without `build` instruction", function () {
            var stream = spa.html();
            void function () {
                stream.write(new File({
                    path: "/foo.html",
                    contents: new Buffer("<html><!-- endbuild --></html>")
                }));
            }.should.throw("Found an endbuild block without build block");
        });

        it("should ignore null files", function () {
            var stream = spa.html();

            stream.write(new File({
                path: "/meow.html",
                contents: null
            }));

            var expected = gulp.src("./test/html/expected/ignore-null-files/*");
            var actual = gulp.src("./test/html/fixtures/ignore-null-files/*").pipe(stream);
            return actual.should.produce.sameFilesAs(expected);
        });

        it("should let the source be defined in the gulpfile if build has no sources", function () {
            var expected = gulp.src("./test/html/expected/source-defined-in-gulpfile/*");
            var actual = gulp.src("./test/html/fixtures/source-defined-in-gulpfile/*.html")
                .pipe(spa.html({
                    assetsDir: "./test/html/fixtures/source-defined-in-gulpfile/",
                    pipelines: {
                        js: function () {
                            return gulp.src(["file1.js", "file2.js"], { cwd: "./test/html/fixtures/source-defined-in-gulpfile/" })
                                .pipe(concat("joined.js"));
                        }
                    }
                }));
            return actual.should.produce.sameFilesAs(expected);
        });

        it("should allow overriding options for a build in the declaration", basicCase("html", "expected/override-build-options", {}));

        it("should allow overriding options for a build in the declaration (sources in gulp file)", function () {
            var expected = gulp.src("./test/html/expected/override-build-options-source-defined-in-gulpfile/*");
            var actual = gulp.src("./test/html/fixtures/override-build-options-source-defined-in-gulpfile/*.html")
                .pipe(spa.html({
                    assetsDir: "./test/html/fixtures/override-build-options/",
                    pipelines: {
                        js: function () {
                            return gulp.src(["file1.js", "file2.js"], { cwd: "./test/html/fixtures/override-build-options/" })
                                .pipe(concat("joined.js"));
                        }
                    }
                }));
            return actual.should.produce.sameFilesAs(expected);
        });
    });


    /**
     * JADE pipe tests
     */
    describe(".jade()", function () {
        var tagTypes = [{
            type: "css",
            tagName: "link"
        }, {

            type: "js",
            tagName: "script"
        }];

        describe("with one output file", function () {
            tagTypes.forEach(function (tagType) {
                var type = tagType.type;
                var tagName = tagType.tagName;
                var createConcat = function () {
                    return function (files) {
                        return files.pipe(concat("joined." + type));
                    };
                };

                it("should produce only one " + tagName + " tag",
                    basicCase("jade", "one-" + tagName + "-tag", createKeyValue(type, createConcat())));
                it("should preserve leading slash in paths for " + tagName + " tag",
                    basicCase("jade", "preserve-leading-slash-one-" + tagName + "-tag", createKeyValue(type, createConcat())));
                it("should not add leading slash to " + tagName + " tags' paths that didn't have it",
                    basicCase("jade", "dont-add-leading-slash-one-" + tagName + "-tag", createKeyValue(type, createConcat())));
            });
        });

        /*describe("with multiple output files", function () {
            tagTypes.forEach(function (tagType) {
                var type = tagType.type;
                var tagName = tagType.tagName;

                it("should produce multiple " + tagName + " tags using original whitespace convention",
                    basicCase("jade", "many-" + tagName + "-tag", {}));
                it("should preserve leading slash in paths for " + tagName + " tags",
                    basicCase("jade", "preserve-leading-slash-many-" + tagName + "-tag", {}));
                it("should not add leading slash to " + tagName + " tags' paths that didn't have it",
                    basicCase("jade", "dont-add-leading-slash-many-" + tagName + "-tag", {}));
            });
        });

        it("should use the pipeline titled `main` for the main file", basicCase("jade", "use-pipeline-named-main", {
            main: function (files) {
                return files.pipe(rename("foo.html"));
            }
        }));

        it("should work with multiple html files", basicCase("jade", "multiple-builds", {
            js: function (files) {
                return files.pipe(concat("joined.js"));
            },
            css: function (files) {
                return files.pipe(concat("joined.css"));
            }
        }));

        it("should not insert files that aren't CSS or JS", basicCase("jade", "dont-insert-unknown", {}));

        it("should work with html files without any builds", basicCase("jade", "no-builds", {}));

        it("should work when css files are moved to another directory", basicCase("jade", "link-tags-moved-to-directory", {
            css: function (files) {
                return files.pipe(rename({ dirname: "css" }));
            }
        }));

        it("should throw an error if streaming is attempted", function () {
            var stream = spa.html();
            void function () {
                stream.write(new File({
                    path: "/foo.html",
                    contents: through.obj()
                }));
            }.should.throw("Streaming not supported");
        });

        it("should throw an error if the file has an `endbuild` instruction without `build` instruction", function () {
            var stream = spa.html();
            void function () {
                stream.write(new File({
                    path: "/foo.html",
                    contents: new Buffer("<html><!-- endbuild --></html>")
                }));
            }.should.throw("Found an endbuild block without build block");
        });

        it("should ignore null files", function () {
            var stream = spa.html();

            stream.write(new File({
                path: "/meow.html",
                contents: null
            }));

            var expected = gulp.src("./test/html/expected/ignore-null-files/*");
            var actual = gulp.src("./test/html/fixtures/ignore-null-files/*").pipe(stream);
            return actual.should.produce.sameFilesAs(expected);
        });

        it("should let the source be defined in the gulpfile if build has no sources", function () {
            var expected = gulp.src("./test/html/expected/source-defined-in-gulpfile/*");
            var actual = gulp.src("./test/html/fixtures/source-defined-in-gulpfile/*.html")
                .pipe(spa.html({
                    assetsDir: "./test/html/fixtures/source-defined-in-gulpfile/",
                    pipelines: {
                        js: function () {
                            return gulp.src(["file1.js", "file2.js"], { cwd: "./test/html/fixtures/source-defined-in-gulpfile/" })
                                .pipe(concat("joined.js"));
                        }
                    }
                }));
            return actual.should.produce.sameFilesAs(expected);
        });

        it("should allow overriding options for a build in the declaration", basicCase("jade", "expected/override-build-options", {}));

        it("should allow overriding options for a build in the declaration (sources in gulp file)", function () {
            var expected = gulp.src("./test/html/expected/override-build-options-source-defined-in-gulpfile/*");
            var actual = gulp.src("./test/html/fixtures/override-build-options-source-defined-in-gulpfile/*.html")
                .pipe(spa.html({
                    assetsDir: "./test/html/fixtures/override-build-options/",
                    pipelines: {
                        js: function () {
                            return gulp.src(["file1.js", "file2.js"], { cwd: "./test/html/fixtures/override-build-options/" })
                                .pipe(concat("joined.js"));
                        }
                    }
                }));
            return actual.should.produce.sameFilesAs(expected);
        });*/
    });

    it("should allow multiple builds through the same pipeline", basicCase("html", "multiple-builds-with-same-pipeline", {
        js: function (files) {
            return files.pipe(rename(function (file) {
                // do nothing, dummy pipeline
            }));
        }
    }));

    var id;

    before(function () {
        id = 0;
    });

    it("should allow multiple builds in different files through the same pipeline",
        basicCase("html", "multiple-builds-in-different-files-with-same-pipeline", {
            js: function (files) {
                id += 1;
                return files.pipe(concat("joined" + id + ".js"));
            }
    }));
});
