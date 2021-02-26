require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const app = express();
const expressEjsLayout = require('express-ejs-layouts')
const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const passport = require("passport");


const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
var http = require('http');
var server = http.createServer(app);
var port = process.env.PORT;
var listener = server.listen(port);
var io = require('socket.io')(server);
// TODO agregar CORS al servidor de socket

//passport config:
require('./config/passport')(passport)
//mongoose
mongoose.connect('mongodb://localhost/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('connected to db'))
  .catch((err) => console.log(err));

//EJS
app.set('view engine', 'ejs');
app.use(expressEjsLayout);

//BodyParser
app.use(express.urlencoded({
  extended: false
}));

//express session
var sessionStore = MongoStore.create({
  mongoUrl: 'mongodb://localhost/sessions'
})

app.use(session({
  // original
  // secret : 'secret',
  // resave : true,
  // saveUninitialized : true

  //middleware para que funque con socketio
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // secure: process.env.ENVIRONMENT !== 'development' && process.env.ENVIRONMENT !== 'test',
    maxAge: 2419200000
  },
  secret: process.env.SECRET_KEY_BASE
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// Reading your user base ont he user.id
passport.deserializeUser(function(id, done) {
  User.get(id).run().then(function(user) {
    done(null, user.public());
  });
});

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
})
app.use(express.static('public'));

//Routes
app.use('/', require('./routes/index'));
// app.use('/users',require('./routes/users'));

app.listen(process.env.EXPRESSPORT);


// **************
// SOCKET SERVER
// **************

// share session with express
io.use(passportSocketIo.authorize({
  key: 'connect.sid',
  secret: process.env.SECRET_KEY_BASE,
  store: sessionStore,
  passport: passport,
  cookieParser: cookieParser
}));

// var eventSocket = io.of('/events');
// // on connection event
// eventSocket.on('connection', function(socket) {
//
//   // example 'event1', with an object. Could be triggered by socket.io from the front end
//   socket.on('event1', function(eventData) {
//   	// user data from the socket.io passport middleware
//     if (socket.request.user && socket.request.user.logged_in) {
//       console.log(socket.request.user);
//     }
//   });
// });

const User = require('./models/user');
var players = []


io.on('connection', (socket) => {
  // user data from the socket.io passport middleware
  if (socket.request.user && socket.request.user.logged_in) {
    // usuario logueado
    let userId = socket.request.user._id
    console.log("user connected", socket.request.user);

    let newPlayerData = {
      id: userId,
      nombre: socket.request.user.name,
      color: socket.request.user.color
    }

    //socket.emit("id", userId) // Le aviso cual es su id
    // le aviso su id y color
    socket.emit("loginData", newPlayerData)

    for (var p in players) {
      socket.emit("newPlayer", players[p]) // le mando cada uno de los players existentes
    }
    players[userId] = newPlayerData // Agrego este player al array

    socket.broadcast.emit("newPlayer", players[userId]) // Les aviso al resto del nuevo jugador


    console.log("Nuevo player", userId, "Players online", Object.keys(players).length)
    console.log(players)


    socket.on('disconnect', () => {
      delete players[userId] // Elimino al player del array
      socket.broadcast.emit("deletePlayer", userId) // Les aviso al resto que este se fue

      console.log("Usuario desconectado", "Usuarios conectados", Object.keys(players).length)
      console.log(players)
    })

    socket.on("playerUpdate", (data) => {
      players[data.id][data.parameter] = data.value; // Guardo en en este jugador
      console.log(data.parameter, data.value)

      // Si cambió el color lo guardo en su DB
      if (data.parameter == "color") {
        User.findOne({
          _id: userId
        }, function(err, userDb) {
          if (userDb) {
            userDb.color = data.value;
            userDb.save(function(err) {
              if (err) {
                // TODO: Handle the error!
              }
              // console.log("color guardado")
            });
          }
        })
      }
      socket.broadcast.emit("otherUpdate", data) // Le aviso a los demas players conectados
    })
  }
})




console.log(`App is listening on port ${listener.address().port}`);
