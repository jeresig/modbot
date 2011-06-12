#!/usr/bin/env node
/*
 * Reddit Moderation Bot
 *  By John Resig
 */

// Required modules
var fs = require("fs"),
	http = require("http"),
	urlParse = require("url"),
	qs = require("querystring"),

	// The only non-built-in module
	// Install by doing `npm install mustache`
	mustache = require("mustache"),

	// Extract information from a Reddit comment URL
	urlTest = /reddit.com\/r\/([^\/]+)\/comments\/[^\/]+/,

	// How frequently to update the backup
	MIN = 60000,

	// How long to wait before a user is allowed to
	// unblock another URL
	DAY = 24 * 60 * MIN,

	// Configuration files
	backupFile = "backup.json",
	tmplFile = "template.txt",
	
	// Reddit servers return a couple different status codes
	// that all seem to indicate a "successful" response
	validCodes = {
		200: true,
		502: true
	},

	// The port on which the web server runs
	serverPort = 8080;

// Load the backup file
loadBackup();

// Once a minute clean up any old IP and User blocks
// Also save a copy of the backup file if a change occurred
setInterval( updateBackup, MIN );

// Load the template file
loadTmpl();

// Reload the template file when modified
fs.watchFile( tmplFile, function( cur, prev ) {
	if ( cur.mtime !== prev.mtime ) {
		loadTmpl();
	}
});

// Load the list of viable sub-reddits from the server
loadReddits( runServer );

// Every 10 minutes attempt to reload the list of sub-reddits
setInterval( loadReddits, 10 * MIN );

// Run the web server
function runServer() {
	console.log( "Starting web server on port " + serverPort + "..." );
	
	http.createServer(function( req, res ) {
		res.writeHead( 200, { "Content-type": "text/html" } );

		// Grab the IP address of the user, work around proxies too
		// Use this to prevent too many requests
		var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress,

			// Grab the query string
			query = urlParse.parse( req.url, true ).query,

			// And the referer of the request
			// (we can pre-fill the form this way)
			referer = req.headers.referer;
	
		// If a URL was provided in a form, use that
		if ( query.url ) {
			// Make sure that too many checks weren't done today
			if ( backup.ips[ ip ] && backup.ips[ ip ].length >= 5 ) {
				return show({ toomany: true });
			}
			
			// IF we're good then check the URL
			testURL( query.url, function( obj ) {
				// Keep track of the number of checks done from this IP
				if ( !obj.error ) {
					if ( !backup.ips[ ip ] ) {
						backup.ips[ ip ] = [];
					}
					
					// Remember when a request was made
					backup.ips[ ip ].push( now() );
				}
				
				show( obj );
			});
	
		// If we're checking a page
		} else if ( query.id ) {
			approvePost( query.id, show );
	
		// Otherwise show the welcome form
		} else {
			show({
				nourl: true,
				referer: urlTest.test( referer ) ? referer : "",
				reddits: backup.reddits,
				showsub: true
			});
		}

		// Run the template and generate the page
		function show( obj ) {
			// We pass along the URL for rendering
			obj.url = query.url;

			// Render the template and send the
			// response back to the client
			res.end( mustache.to_html( tmpl, obj ) );
		}
	}).listen( serverPort );
}

function testURL( url, done ) {
	var result = { time: now() }, msg;

	// Make sure we're on a page with a properly-formatted URL
	if ( urlTest.test( url ) ) {
		result.r = RegExp.$1;
	
	// An error message if the URL looks to be incorrect
	} else {
		return done({ invalid: true });
	}
		
	// Make sure that we're only requesting a URL that's in an approved sub-reddit
	if ( backup.reddits.indexOf( result.r ) < 0 ) {
		return done({ wrongsub: true, reddit: result.r, reddits: backup.reddits, showsub: true });
	}

	request( "GET", urlParse.parse( url ).pathname, function( response ) {
		if ( response.error ) {
			return done( response );
		}
		
		var body = response.body;

		// Extract the ID of the post
		if ( /name="thing_id" value="([^"]+)"/.test( body ) ) {
			result.id = RegExp.$1;
		}
		
		// Grab the username of the submitter
		if ( /<span>by&#32;<a href="http:\/\/www.reddit.com\/user\/([^"]+)/.test( body ) ) {
			result.user = RegExp.$1;
		}

		// Get the modhash of the moderator
		if ( /modhash: '([^']+)'/.test( body ) ) {
			result.uh = RegExp.$1;
		}

		// Get the upvotes and downvotes
		if ( /<span class="upvotes">.*?([\d,]+)<.*?class='number'>([\d,]+)/i.test( body ) ) {
			// Let the user know what the mod sees
			// (this can be informative, especially if there is no activity)
			result.up = RegExp.$1;
			result.down = RegExp.$2;
		}
		
		// If we couldn't find the information that we needed, display an error message
		if ( !result.id || !result.user || !result.uh ) {
			// The default message, in case things don't appear as they seem
			done({ nopost: true });

		// See if the post was manually approved
		} else if ( /title="approved by (\w+)"/.test( body ) ) {
			done({ approved: true, user: RegExp.$1 });

		// See if the post was removed by the spam filter
		} else if ( /<b>\[ removed \]/i.test( body ) ) {
			backup.checks[ result.id ] = result;
		
			// See if we're allowed to approve the post
			if ( !backup.users[ result.user ] ) {
				done({ flagged: true, id: result.id  });
			
			// Otherwise we need to display an error message
			} else {
				done({ flagged: true, used: true });
			}

		// See if a moderator manually removed a post
		} else if ( /<b>\[ removed by (\w+) \]/i.test( body ) ) {
			done({ removed: true, reddit: result.r });

		// Otherwise display general information about the post
		} else {
			done({ about: true, up: result.up, down: result.down });
		}
	});
}

// Approve a Spam-filtered post
function approvePost( id, done ) {
	var obj = backup.checks[ id ], options;
	
	// If the cache didn't persist for some reason
	// (Such as a server restart)
	if ( !obj ) {
		return done({ error: true });
	}
	
	// Make sure that we haven't done a request for this user recently
	if ( !backup.users[ obj.user ] ) {
		return done({ used: true });
	}
	
	// Build up the request object
	options = { renderstyle: "html", id: obj.id, uh: obj.uh, r: obj.r }
	
	// And contact Reddit to approve the post
	request( "POST", "/api/approve", qs.stringify( options ), function( response ) {
		// Display an error response to the user
		if ( response.error ) {
			return done( response );
		}
	
		// Make sure that multiple approval requests
		// are limited to one a day per user
		backup.users[ result.user ] = now();
		
		done({ approved: true });
	});
}

// Load in the list of supported sub-Reddits.
function loadReddits( done ) {
	var tmp = [];

	// Load the initial page
	loadRedditPage( "", function() {
		// Make sure they're in order
		backup.reddits = tmp.sort();

		if ( typeof done === "function" ) {
			done();
		}
	});

	// Request one page's worth of sub-reddits
	function loadRedditPage( after, done ) {
		request( "GET", "/reddits/mine/moderator/?count=0&after=" + after, function( response ) {
			// Bail if the server failed
			if ( response.error ) {
				return done( response );
			}
	
			// Grab body HTML and extract sub-reddit names
			var body = response.body,
				findReddits = /<span class="domain">\(\/r\/([^\/]+)/g;
	
			// Grab all sub-reddits
			while ( findReddits.test( body ) ) {
				tmp.push( RegExp.$1 );
			}
	
			// See if there's a "Next" link that we need to follow
			if ( /after=([^"]+)/.test( body ) ) {
				loadReddits( RegExp.$1, done );
		
			// Otherwise we're all done
			} else {
				done();
			}
		});
	}
}

/*
 * Load and Save Config Files
 */

function loadTmpl() {
	this.tmpl = fs.readFileSync( tmplFile, "utf8" );
}

function loadBackup() {
	this.backup = JSON.parse( fs.readFileSync( backupFile, "utf8" ) );
}

function updateBackup() {
	var curTime = now(), updated = false;

	// Go through all the IPs that've made a request
	Object.keys( backup.ips ).forEach(function( ip ) {
		// Expire any old requests made by the IP request
		backup.ips[ ip ] = backup.ips[ ip ].filter(function( time ) {
		 	var ret = time + DAY > curTime;
			updated = ret ? updated : true;
			return ret;
		});
	
		// If no requests remain, remove the entire IP store
		if ( backup.ips[ ip ].length === 0 ) {
			delete backup.ips[ ip ];
		}
	});
	
	// Go through all the users that've unblocked a URL
	Object.keys( backup.users ).forEach(function( user ) {
		// Remove the block on the user
		if ( backup.users[ user ] + DAY < curTime ) {
			updated = true;
			delete backup.users[ user ];
		}
	});

	// Save a backup if the data has changed
	if ( updated ) {
		// TODO: Change this to async
		fs.writeFileSync( backupFile, JSON.stringify( backup ), "utf8" );
	}
}

/*
 * General Utility Functions
 */

// Get the current time
function now() {
	return (new Date).getTime();
}

// Simple method for requesting a page off of Reddit
// Request will time out after 10 seconds
// Callback has two possible response types:
//   { error: true }
//   { body: "... html ..." }
function request( method, path, data, done ) {
	// Allow us to leave off the data param
	if ( method === "GET" ) {
		done = data;
		data = null;
	}

	// Initiate the request
	var req = http.request({
		host: "www.reddit.com",
		port: 80,
		path: path,
		method: method,

		// Make sure we pass along the cookie
		// to make sure that the session is authenticated
		headers: { Cookie: "reddit_session=" + backup.cookie }
	}, function( response ) {
		// Cancel the request timeout
		clearTimeout( timer );
	
		// Anything that isn't a valid status code is an error
		if ( !validCodes[ response.statusCode ] ) {
			return done({ error: true });
		}
			
		// Collect the response text from the server
		var data = [];
			
		response.on( "data", function( chunk ) {
			data.push( chunk );
		});
			
		response.on( "end", function() {
			done({ body: data.join("") });
		});
	});

	// Send the request
	req.end( data );
	
	// Timeout the request after 10 seconds
	var timer = setTimeout(function() {
		// Cancel the request
		req.abort();

		// Send an error message back to the user
		done({ error: true });
	}, 10000);
}
