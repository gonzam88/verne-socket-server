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
// SETTINGS JUEGO
// **************
var juego = {
  personasPorTurno: 2,
  countdown: 5, // en segundos, countdown cuando el juego está por arrancar
  duracion: 10, // en segundos, duracion del juego
  cooldown: 2, // en segundos, tiempo de espera antes de arrancar un nuevo juego
  state: 0,
  countdownEnd: 0, // timestamp de cuando termina el countdown
}

// states room juego
// 0 - recibiendo jugadores
// 1 - recibio jugadores, arranca countdown
// 2 - juego iniciado
// 3 - juego terminado (cooldown)


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

    // agrego este nuevo jugador a la sala de espera
    // TODO chequear si cumple requisito para jugar
    socket.join('espera');
    socket.emit("juego:espera")
    PuedeIniciarJuego()


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



function PuedeIniciarJuego() {
  io.in('espera').clients((error, clients) => {
    if (error) throw error;

    if (clients.length >= juego.personasPorTurno && juego.state == 0) {
      console.log("Moviendo a los jugadores a la sala de Juego.")
      clients.forEach(function(client){
        let clientSocket = io.sockets.sockets[client]
        clientSocket.leave("espera")
        clientSocket.join("juego")
      })
      juego.state = 1 // arranca el countdown
      juego.countdownEnd = Date.now() + (juego.countdown * 1000)

      // les aviso y les paso el timestamp de cuando arranca el juego
      io.in("juego").emit("juego:countdown", {
        countdown: juego.countdownEnd
      });
      setTimeout(IniciarJuego, juego.countdown * 1000);
    }
  });
}

function IniciarJuego() {
  // TODO volver a chequear la cantidad de jugadores
  console.log("empezó el juego")
  juego.state = 2 // arranca el juego
  io.in("juego").emit("juego:comienza", {
    duracion: juego.duracion
  });
  setTimeout(TerminarJuego, juego.duracion * 1000);
}

function TerminarJuego() {
  console.log("terminó el juego")
  io.in("juego").emit("juego:termino");
  // vacio el room Juego
  io.in('juego').clients((error, clients) => {
    if (error) throw error;
    clients.forEach(function(client){
      let clientSocket = io.sockets.sockets[client]
      clientSocket.leave("juego")
    })
  })

  juego.state = 3 // termino juego. cooldown
  setTimeout(CooldownJuegoTermino, juego.cooldown * 1000);
}

function CooldownJuegoTermino() {
  juego.state = 0
  PuedeIniciarJuego()
}



console.log(`App is listening on port ${listener.address().port}`);
