/*global module:false*/
module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        mocha_phantomjs: {
            all: ['public/html/*.html']
        }
    });

    // For this to work, you need to have run `npm install grunt-simple-mocha`
    grunt.loadNpmTasks('grunt-mocha-phantomjs');

    // Add a default task. This is optional, of course :)
    grunt.registerTask('default', ['mocha_phantomjs']);
    grunt.registerTask('test', 'default');
};
