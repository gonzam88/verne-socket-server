var socket = io();
socket.emit("logged", "holis");

var colorSlider = VueColor.Slider

var app = new Vue({
  el: '#app',
  components: {
    'slider-picker': colorSlider,
  },
  data: {
    showOthers: false,
    
    id:-1,
    cantPlayers: 0,
    players: [],
    
    color:'#000000',
    nombre: "",
    
    // borrar esto
    slider01:0,
    slider02:0,
    slider03:0,
    
    conectados:0
    
  },
  watch:{
    slider01:function(val){
      this.SendUpdate("slider01", val)
    },
    slider02:function(val){
      this.SendUpdate("slider02", val)
    },
    slider03:function(val){
      this.SendUpdate("slider03", val)
    },
    /*slider01:function(){
      if(this.serverRequest){this.serverRequest = false; return}
      
      console.log("slider01",this.slider01)
      socket.emit("valueChange", {parameter:"slider01",value:this.slider01})
    },
    slider02:function(){
      if(this.serverRequest){this.serverRequest = false; return}
      
      console.log("slider02",this.slider02)
      socket.emit("valueChange", {parameter:"slider02",value:this.slider02})
    },
    slider03:function(){
      if(this.serverRequest){this.serverRequest = false; return}
      
      console.log("slider03",this.slider03)
      socket.emit("valueChange", {parameter:"slider03",value:this.slider03})
    },*/
  },
  computed:{
    
  },
  methods:{
    
    resetPlayerArr:function(){
      this.players = []
    },
    newPlayer: function(data){
      console.log("newPlayer", data)
      this.players.push(data)
      this.cantPlayers++
    },
    
    deletePlayer: function(data){
      console.log("deletePlayer", data)
      this.players.find((o, i) => {
        if (typeof(o) != "undefined" && o.id == data) {
            this.players.splice(i,1)
            return true; // stop searching
          }
      });

      
      app.cantPlayers--
    },
    
    SendUpdate:function(_parameter, _value){
      socket.emit("playerUpdate", {id: this.id, parameter: _parameter, value: _value})
    },
    
    OtherUpdate:function(data){
      this.players.find((o, i) => {
        if (typeof(o) != "undefined" && o.id == data.id) {
          //this.players[i][data.parameter] = data.value
          this.$set(this.players[i], data.parameter, data.value);
          console.log(this.players[i], data.parameter,data.value)  
          return true; // stop searching
          }
      });
    },
  }
})


// MENSAJES DEL SERVIDOR
socket.on('disconnect', function () {
   console.log('Client disconnecting');
   app.resetPlayerArr();
});

socket.on("id",function(data){ // Recibo mi ID
  console.log("id", data)
  app.id = data
})


socket.on("newPlayer", function(data){ // Un player nuevo
  console.log("newPlayer", data)
  app.newPlayer(data)
})

socket.on("deletePlayer",function(data){ // Un player se fue y lo borro de la lista
  app.deletePlayer(data)
})


socket.on("otherUpdate", function(data){
  console.log("otherUpdate", data)
  app.OtherUpdate(data)
})


/*
// OLD
socket.on("valueChange", function(data){
  console.log("Server Request",data)
  app.serverRequest = true
  app[data.parameter] = data.value
})

socket.on("clickedBut", function(data){
  console.log("Server Request",data)
})*/



// admin url get
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
if(urlParams.has("admin")){
  app._data.admin=true
}

$(function() {
    var $pad = $(".pad")
      .xy({
        displayPrevious:false,
        min : -100,
        max : 100,
        fgColor:"#222222",
        bgColor:"#EEEEEE", 
        change : function (value) {
            console.log("change : ", value);
          app.SendUpdate("padx", value[0])
          app.SendUpdate("pady", value[1])
        }
    }).css({'border':'1px solid #BBB'});
})