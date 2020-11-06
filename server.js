var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT;
var listener = server.listen(port);

const fs = require('fs');

var conectados = 0




// Routing
app.use(express.static('public'));
// Chatroom

// Load data from json
let rawdata = fs.readFileSync('data.json');
let obj = JSON.parse(rawdata);



io.on('connection', (socket) => {
  conectados++
  io.emit("conectados",conectados)
  
  console.log("user connected",socket.id)
  console.log("Usuarios conectados ",conectados)
  
  /*socket.on('CH01', function (from, msg) {
    console.log('MSG', from, ' saying ', msg);
  });
  */
  
  
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
     
  
  

  
  
  
  socket.on('disconnect', () => {
    conectados--
    io.emit("conectados",conectados)
    console.log("Usuarios conectados ",conectados)
  })
  
  
});

console.log(`Your app is listening on port ${listener.address().port}`);
