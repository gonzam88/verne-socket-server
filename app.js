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
var timesyncServer = require('timesync/server');
// TODO agregar CORS al servidor de socket

//passport config:
require('./config/passport')(passport)
//mongoose
mongoose.connect('mongodb://localhost/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false, // https://mongoosejs.com/docs/deprecations.html#findandmodify
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
  countdown: 6, // en segundos, countdown cuando el juego está por arrancar
  duracion: 20, // en segundos, duracion del juego
  cooldown: 2, // en segundos, tiempo de espera antes de arrancar un nuevo juego
  state: 0,
  countdownEnd: 0, // timestamp de cuando termina el countdown
  juegoEnd: 0,
  participacionesMaximas: 0, // cantidad de veces que el jugador puede participar. 0> infinito
  segundosAvisoInactividad: 5,
  segundosInactividad: 10, // segundos que pueden pasar antes de echar a un jugador por inactividad
  parametrosInactividad: ['color', 'button01', 'button02'], // Array de parametros enviados por el cliente que resetean el timer por inactividad
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
// var timerInactividad;

io.on('connection', (socket) => {
  // user data from the socket.io passport middleware
  if (socket.request.user && socket.request.user.logged_in) {
    // usuario logueado
    var userId = socket.request.user._id
    console.log("user connected", socket.request.user.name, userId);

    // busco si este ID ya está logueado en otro socket y lo echo (para que no esté dos veces el mismo usuario)
    for (var p in players) {
      if (p == userId) {
        // Esta dos veces, le cierro la conexión al socket viejo
        console.log("cerrando conexion de ", players[p].id, " socket id", players[p].socketid)
        io.sockets.sockets[players[p].socketid].emit("conexionDuplicada")
        io.sockets.sockets[players[p].socketid].disconnect()
      }
    }
    // for(let i=0; i < players.length; i++){
    //   console.log(players[i].id , userId)
    //   if(players[i].id == userId){
    //     // Esta dos veces, le cierro la conexión al socket viejo
    //     console.log("cerrando conexion de ",players[i].id, " socket id", players[i].socketid)
    //     io.sockets.sockets[players[i].socketid].disconnect()
    //     // socket.manager.onClientDisconnect(socket.id);
    //   }
    // }

    let newPlayerData = {
      id: userId,
      nombre: socket.request.user.name,
      color: socket.request.user.color,
      socketid: socket.id,
    }

    //socket.emit("id", userId) // Le aviso cual es su id
    // le aviso su id y color
    socket.emit("loginData", newPlayerData)

    for (var p in players) {
      socket.emit("newPlayer", players[p]) // le mando cada uno de los players existentes
    }
    players[userId] = newPlayerData // Agrego este player al array

    socket.broadcast.emit("newPlayer", players[userId]) // Les aviso al resto del nuevo jugador


    console.log("Players online", Object.keys(players).length)
    // console.log(players)

    // agrego este nuevo jugador a la sala de espera
    AgregarJugadorASalaDeEspera(socket)

    socket.on('disconnect', () => {
      delete players[userId] // Elimino al player del array
      socket.broadcast.emit("deletePlayer", {userId:userId}) // Les aviso al resto que este se fue

      console.log("Usuario desconectado", "Usuarios conectados", Object.keys(players).length)
      // console.log(players)
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

      // Le aviso a los demas players conectados
      socket.broadcast.emit("otherUpdate", data)

      // Si está jugando y es un parametro válido, cancelo el timer de inactividad
      if (players[data.id].estaJugando && juego.parametrosInactividad.includes(data.parameter)) {
        ResetearTimerInactividad(socket)
        if(players[data.id].avisadoInactividad ){
          socket.emit("juego:avisoInactividad:off")
          players[data.id].avisadoInactividad = false
        }
      }
    })

    socket.on("juego:reconectar", (data) => {
      AgregarJugadorASalaDeEspera(socket)
    })

    socket.on('timesync', function (data) {
      socket.emit('timesync', {
        id: data && 'id' in data ? data.id : null,
        result: Date.now()
      });
    });

  } // usuario logueado
}) // on connection



function PuedeIniciarJuego() {
  io.in('espera').clients((error, clients) => {
    if (error) throw error;

    if (clients.length >= juego.personasPorTurno && juego.state == 0) {
      console.log(`Moviendo a los jugadores a la sala de Juego. Empezando en ${juego.countdown} segundos.`)
      clients.forEach(function(client) {
        let clientSocket = io.sockets.sockets[client]
        clientSocket.leave("espera")
        clientSocket.join("juego")
      })
      juego.state = 1 // arranca el countdown
      juego.countdownEnd = Date.now() + (juego.countdown * 1000)

      // les aviso y les paso el timestamp de cuando arranca el juego
      io.in("juego").emit("juego:countdown", {
        duracion: juego.countdown,
        timestamp: juego.countdownEnd
      });
      setTimeout(IniciarJuego, juego.countdown * 1000);
    }
  });
}

function IniciarJuego() {
  // TODO volver a chequear la cantidad de jugadores
  console.log(`Empezó el juego. Duración ${juego.duracion} segundos`)
  juego.state = 2 // arranca el juego
  juego.juegoEnd = Date.now() + (juego.duracion * 1000)
  io.in("juego").emit("juego:comienza", {
    duracion: juego.duracion,
    timestamp: juego.juegoEnd
  });

  io.in('juego').clients((error, clients) => {
    if (error) throw error;
    clients.forEach(function(client) {
      let clientSocket = io.sockets.sockets[client]
      ResetearTimerInactividad(clientSocket)
      players[clientSocket.request.user._id].estaJugando = true
    })
  })

  setTimeout(TerminarJuego, juego.duracion * 1000);
}

function TerminarJuego() {
  console.log("Terminó el juego")
  io.in("juego").emit("juego:termino");
  // vacio el room Juego
  io.in('juego').clients((error, clients) => {
    if (error) throw error;
    clients.forEach(function(client) {
      let clientSocket = io.sockets.sockets[client]
      clientSocket.leave("juego")

      // TODO guardar datos en DB
      let participacion = {
        date: Date.now(),
        puntos: Math.floor(Math.random() * Math.floor(10)) // random
      }

      let userId = clientSocket.request.user._id
      User.findOneAndUpdate({
        _id: userId
      }, {
        $push: {
          participaciones: participacion
        }
      });
      players[userId].estaJugando = false
    })
  })

  juego.state = 3 // termino juego. cooldown
  setTimeout(CooldownJuegoTermino, juego.cooldown * 1000);
}

function CooldownJuegoTermino() {
  juego.state = 0
  PuedeIniciarJuego()
}

function ResetearTimerInactividad(playerSocket) {
  let playerId = playerSocket.request.user._id
  if (typeof(players[playerId].timerAvisoInactividad) !== 'undefined') {
    clearTimeout(players[playerId].timerAvisoInactividad)
  }
  if (typeof(players[playerId].timerInactividad) !== 'undefined') {
    clearTimeout(players[playerId].timerInactividad)
  }
  // console.log(`iniciando timer de ${playerSocket.request.user.name}`)
  // inicio timer de preaviso inactividad
  players[playerId].timerAvisoInactividad = setTimeout(function() {
    if (!players[playerId].estaJugando) {
      return
    }
    playerSocket.emit("juego:avisoInactividad:on")
    players[playerId].avisadoInactividad = true
  }, juego.segundosAvisoInactividad * 1000)

  // Inicio timer de inactividad
  players[playerId].timerInactividad = setTimeout(function() {
    if (!players[playerId].estaJugando) {
      return
    }
    // Pasó el tiempo máximo, echamos al jugador
    console.log(`Echando a ${playerSocket.request.user.name} por inactividad`);
    playerSocket.leave("juego")
    playerSocket.emit("juego:inactividad", {
      error: "Fuiste echado por inactividad",
      permitirReconectar: true
    });
    players[playerId].estaJugando = false
  }, juego.segundosInactividad * 1000);

}



function AgregarJugadorASalaDeEspera(_socket){
  participaciones = _socket.request.user.participaciones
  if (juego.participacionesMaximas == 0 || participaciones.length < juego.participacionesMaximas) {
    _socket.join('espera');
    _socket.emit("juego:espera")
    PuedeIniciarJuego()
  } else {
    _socket.emit("juego:participacionMaxima", {
      error: `No podés jugar, ya participaste ${participaciones.length} veces.`
    })
  }
}

console.log(`App is listening on port ${listener.address().port}`);
