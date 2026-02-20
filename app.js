
const createError = require('http-errors');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
// const rateLimit = require('express-rate-limit');

//Morgan Middleware import ---------------------------------->
const {morganMiddleware} = require('./middlewares/morganMiddleware')


// MongoDB Connection import here
require('./config/connection');

// Initialize the app
let app = express();

// Configure .env
require('dotenv').config({ path: __dirname + '/.env' });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname + '/uploads'));
app.use('/uploads', express.static('uploads'));

// REMOVE X-POWERED-BY FROM RESPONSE HEADER
app.disable('x-powered-by');

// REMOVE SERVER FROM RESPONSE HEADER
app.disable('Server');

app.use(
  bodyParser.json({
    limit: '50mb',
  }),
); // support json encoded bodies

app.use(
  bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
  }),
); // support encoded bodies

// ---------------- Logger add ----------------
app.use(morganMiddleware);

// //-------- limit ----------------
// app.use(limiter);


/* using middleware */
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS,HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,access-token,x-http-method-override,x-access-token,authorization,lastlogin,token',
  );
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type,expire');
  next();
});

// set Absolute Path or directory of the Project globally in appPath global Variable
global.appPath = __dirname;

// Load the constants
global.constants = require(global.appPath + '/config/constants');

// Import the Routes and Socket functions //Initialize the events
const apiRouter = require('./routes/userRoutes');
const adminRouter = require('./routes/adminRoutes');
const socketFunc = require('./helpers/socketFunctions');

/**
 * Get port from environment and store in Express.
 */
let port = normalizePort(process.env.PORT || '5007');
app.set('port', port);

let server = require('http').createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Socket Configuration
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
});
global.io = io;
// io.use(checkAuthIo);
// socket Connection
io.of('/joinToSocket').on('connection', (socket) => {
  console.log('Socket is Connected...');
  socketFunc.socketResponse(socket);
});
/*
 * Listen to all http response here
 */
function InterceptorForAllResponse(req, res, next) {
  let oldSend = res.send;
  res.send = function (data) {
    // arguments[0] (or `data`) contains the response body
    oldSend.apply(res, arguments);
  };
  next();
}

app.use(InterceptorForAllResponse);

//------------------------------------------- ROUTES ----------------------------------------------//
app.use('/api', apiRouter); // API Routes
app.use('/admin', adminRouter); // ADMIN Routes
//------------------------------------------- ROUTES ----------------------------------------------//

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  console.log(err);
  res.status(err.status || 500).json('error');
});

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  let port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const addr = server.address();
  let bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log('Listening on', bind);
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

module.exports = app;
