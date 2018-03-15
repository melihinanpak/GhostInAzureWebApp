// do not edit this file directly -- it was generated by postinstall.js from server.template.js

//
// content of server.template.js
//

var fs = require('fs');
var path = require('path');

// load our module path cache; if this is the first time the app has been run, the cache will be empty
// and it'll be generated once ghost hast started (so subsequent startups will use the cache)
require('./server.cache.modulePath');

// load our stat cache; if this if the first time the app has been run, the cache will be empty and
// it'll be generated once ghost has started (so subsequent startups will use the cache)
require('./server.cache.stat');

// load our file cache; this will have been generated by the post-install process
eval(require('zlib').gunzipSync(fs.readFileSync(path.resolve(__dirname, 'server.cache.js.gz'))).toString());

// save the original readFileSync that we'll override with our caching version
var originalReadFileSync = fs.readFileSync;

// caching version of readFileSync that avoids the filesystem if the file is in the cache
function cachedReadFileSync(file, options) {
	if (!options || options === 'utf8') {
		var fn = file.replace(path.resolve(__dirname, 'node_modules') + path.sep, '');
		if (fn.endsWith('.js')) {
			fn = fn.substr(0, fn.length - 3);
		}
		if (s[fn]) {
			return s[fn];
		};
	}
	return originalReadFileSync(file, options);
};

// replace standard readFileSync with our caching version
fs.readFileSync = cachedReadFileSync;

// if iisnode is being used, it defines the port we need to use in an environment
// variable; if this variable is defined, we override the config with it otherwise
// the web app won't work correctly
if (process.env.PORT) {
	// we do the require in-place here to ensure it comes from the cache
	require('ghost/core/server/config').set('server:port', process.env.PORT);
}

// on Windows, Ctrl-C (SIGINT) won't be recognised unless we go via readline
if (process.platform === 'win32') {
	var rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on('SIGINT', function () {
		process.emit('SIGINT');
	});
}

//
// content of ghost\index.js
//

// # Ghost Startup
// Orchestrates the startup of Ghost when run from command line.

var startTime = Date.now(),
    debug = require('ghost-ignition').debug('boot:index'),
    ghost, express, common, urlService, parentApp;

debug('First requires...');

ghost = require('ghost/core');

debug('Required ghost');

express = require('express');
common = require('ghost/core/server/lib/common');
urlService = require('ghost/core/server/services/url');
parentApp = express();

debug('Initialising Ghost');
ghost().then(function (ghostServer) {
    // Mount our Ghost instance on our desired subdirectory path if it exists.
    parentApp.use(urlService.utils.getSubdir(), ghostServer.rootApp);

    debug('Starting Ghost');
    // Let Ghost handle starting our server instance.
    return ghostServer.start(parentApp).then(function afterStart() {
        // generate module path cache (if it already exists this will do nothing)
        require('./server.cache.modulePath.generator');
        // generate the stat cache (if it already exists this will do nothing)
        require('./server.cache.stat.generator');
        common.logging.info('Ghost boot', (Date.now() - startTime) / 1000 + 's');

        // if IPC messaging is enabled, ensure ghost sends message to parent
        // process on successful start
        if (process.send) {
            process.send({started: true});
        }
    });
}).catch(function (err) {
    if (!common.errors.utils.isIgnitionError(err)) {
        err = new common.errors.GhostError({err: err});
    }

    common.logging.error(err);

    if (process.send) {
        process.send({started: false, error: err.message});
    }

    process.exit(-1);
});
