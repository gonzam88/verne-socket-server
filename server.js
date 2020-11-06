var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT;
var listener = server.listen(port);

const fs = require('fs');

var players = []


// Routing
app.use(express.static('public'));
// Chatroom

// Load data from json
let rawdata = fs.readFileSync('data.json');
let obj = JSON.parse(rawdata);



io.on('connection', (socket) => {
  
  socket.emit("id", socket.id) // Le aviso cual es su id
  for(var p in players){
    socket.emit("newPlayer", players[p]) // le mando cada uno de los players existentes
  }
  players[socket.id] = // Agrego este player al array
    {
      id:  socket.id,
      nombre: "",
      color: "#000000",
  } 
  socket.broadcast.emit("newPlayer", players[socket.id]) // Les aviso al resto del nuevo jugador
  
  
  
  console.log("Nuevo player",socket.id, "Players online", Object.keys(players).length)
  console.log(players)
  
  
  
  socket.on('disconnect', () => {
    delete players[socket.id] // Elimino al player del array
    socket.broadcast.emit("deletePlayer", socket.id) // Les aviso al resto que este se fue
    
    console.log("Usuario desconectado", "Usuarios conectados", Object.keys(players).length)
    console.log(players)
  })
  
  socket.on("playerUpdate", (data)=>{
    players[data.id][data.parameter] = data.value // Guardo en en este jugador
    socket.broadcast.emit("otherUpdate", data) // Le aviso a los demas players conectados
  })
  
  
  // SERVIDOR COSAS VIEJAS
  socket.on("valueChange", (data) =>{
    console.log(data)
    socket.broadcast.emit(
       'valueChange', 
       {
         parameter: data.parameter,
         value: data.value
       }
     );
  })
  
  socket.on("clickedBut", (data) =>{
    console.log(data)
    socket.broadcast.emit(
       'clickedBut', 
       {
         parameter: data.parameter,
         value: data.value
       }
     );
  })
     
  
  

  
  
  
  
});



console.log(`Your app is listening on port ${listener.address().port}`);
