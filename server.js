const express = require('express')
const app = express()
const db = require("./database.js")
const morgan = require('morgan')
const fs = require ('fs')

const args = require('minimist')(process.argv.slice(2));
const port = args.port || process.env.PORT || 5555

// Store help text 
const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)
// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

// Start an app server
const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
});

app.use( (req, res, next) => {
    // Your middleware goes here.
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referer: req.headers['referer'],
        useragent: req.headers['user-agent']
    }
    const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)') 
    stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.secure, logdata.status, logdata.referer, logdata.useragent) 
    next();
})

// Debug endpoints
if (args.debug) {
    app.get('/app/log/access', (req, res) => {
        const stmt = db.prepare('SELECT * from accesslog').all()
        res.status(200).json(stmt)
    });

    app.get('/app/error', (req, res) => {
        throw new Error('Error test successful.')
    });
}

// If log == True
if (args.log) {
    const writestream = fs.createWriteStream('./access.log', { flags: 'a'})
    app.use(morgan('combined'), {stream: writestream})
}

app.get('/app', (req, res) => {
    // Respond with status 200
    res.statusCode = 200;
    // Respond with status message "OK"
    res.statusMessage = 'OK';
    res.writeHead(res.statusCode, { 'Content-Type' : 'text/plain' });
    res.status(res.statusCode).end(res.statusCode + ' ' + res.statusMessage)
})

app.get('/app/flip', (req, res) => {
    var flip = coinFlip()
    res.type('json')
    res.status(200).json({"flip": flip})
})

app.get('/app/flips/:number', (req, res) => {
    var flips = coinFlips(req.params.number)
    var count = countFlips(flips)
    res.type('json')
    res.json({"raw": flips, "summary": count})
})

app.get('/app/flip/call/heads', (req, res) => {
    res.type('json')
    res.json(flipACoin("heads"))
})

app.get('/app/flip/call/tails', (req, res) => {
    res.type('json')
    res.json(flipACoin("tails"))
})

// Default response for any other request
app.use(function(req, res) {
    res.type('text/plain')
    res.status(404).send('404 NOT FOUND')
})

// Coin Flip Functions
function coinFlip() {
    if (Math.random() < 0.5) {
        return 'heads';
    }
        return 'tails';
}

function coinFlips(flips) {
    let flipSet = new Array(flips);
    let x = 0;
    while (x < flips) {
        flipSet[x] = coinFlip();
        x = x + 1;
    }
    return flipSet;
}

function countFlips(array) {
    let headCount = 0;
    let tailsCount = 0;
    for (let x = 0; x < array.length; x++) {
        if (array[x] == 'heads') {
            headCount++;
        }
        else {tailsCount++;}
    }
    if (headCount == 0) {return {tails: tailsCount}}
    if (tailsCount == 0) {return {heads: headCount}}
    else {
        return {heads: headCount, tails: tailsCount};
    }
    
}

function flipACoin(call) {
    const flipResult = coinFlip();
    if (flipResult == call) {
        return {call: call, flip: flipResult, result: 'win'};
    }
    else {
        return {call: call, flip: flipResult, result: 'lose'}
    }
}