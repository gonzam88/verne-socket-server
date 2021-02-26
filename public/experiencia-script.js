var socket = io();
socket.emit("logged", "holis");

var colorSlider = VueColor.Slider;

let defaultColor = Object.assign({}, this.colors, { a: 1, hex: "#ffffff" })

var app = new Vue({
  el: "#app",
  components: {
    "slider-picker": colorSlider
  },
  data: {
    showOthers: false,

    id: -1,
    cantPlayers: 0,
    players: [],

    color: defaultColor,
    nombre: "",

    // borrar esto
    slider01: 0,
    slider02: 0,
    slider03: 0,

    conectados: 0,

    showClient: true,
    showAdmin: false
  },
  watch: {
    slider01: function(val) {
      this.SendUpdate("slider01", val);
    },
    slider02: function(val) {
      this.SendUpdate("slider02", val);
    },
    slider03: function(val) {
      this.SendUpdate("slider03", val);
    }
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
  computed: {},
  methods: {
    resetPlayerArr: function() {
      this.players = [];
    },
    newPlayer: function(data) {
      console.log("newPlayer", data);
      this.players.push(data);
      this.cantPlayers++;
    },

    deletePlayer: function(data) {
      console.log("deletePlayer", data);
      this.players.find((o, i) => {
        if (typeof o != "undefined" && o.id == data) {
          this.players.splice(i, 1);
          return true; // stop searching
        }
      });

      app.cantPlayers--;
    },

    SendUpdate: function(_parameter, _value) {
      socket.emit("playerUpdate", {
        id: this.id,
        parameter: _parameter,
        value: _value
      });
    },

    OtherUpdate: function(data) {
      this.players.find((o, i) => {
        if (typeof o != "undefined" && o.id == data.id) {
          //this.players[i][data.parameter] = data.value
          this.$set(this.players[i], data.parameter, data.value);
          console.log(this.players[i], data.parameter, data.value);
          return true; // stop searching
        }
      });
    }
  },

});

// MENSAJES DEL SERVIDOR
socket.on("disconnect", function() {
  console.warn("Client disconnecting");
  app.resetPlayerArr();
});


socket.on("loginData", function(data){
  // Recibo mi data de login
  console.log("loginData", data)
  app.id = data.id
  app.color = Object.assign({}, this.colors, { a: 1, hex: data.color })
})

socket.on("newPlayer", function(data) {
  // Un player nuevo
  console.log("newPlayer", data);
  app.newPlayer(data);
});

socket.on("deletePlayer", function(data) {
  // Un player se fue y lo borro de la lista
  app.deletePlayer(data);
});

socket.on("otherUpdate", function(data) {
  console.log("otherUpdate", data);
  app.OtherUpdate(data);
});

socket.on("duplicateConnection", function(data) {
  console.log("CONEXION DUPLICADA", data)
})


// Logica Juego
socket.on("juego:espera", function(data) {
  console.log("ENTRE A SALA DE ESPERA", data)
})
socket.on("juego:countdown", function(data) {
  console.log("ESTA POR COMENZAR EL JUEGO", data)
})
socket.on("juego:comienza", function(data) {
  console.log("COMIENZA EL JUEGO", data)
})
socket.on("juego:termino", function(data) {
  console.log("TERMINÓ EL JUEGO", data)
})
socket.on("juego:participacionMaxima", function(data) {
  console.log("NO PODÉS VOLVER A PARTICIPAR", data)
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
function getQueryParams(qs) {
  qs = qs.split("+").join(" ");

  var params = {},
    tokens,
    re = /[?&]?([^=]+)=([^&]*)/g;

  while ((tokens = re.exec(qs))) {
    params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
  }
  return params;
}

$(function() {
  var $pad = $(".pad")
    .xy({
      displayPrevious: false,
      min: -100,
      max: 100,
      fgColor: "#222222",
      bgColor: "#EEEEEE",
      change: function(value) {
        console.log("change : ", value);
        // app.SendUpdate("padx", value[0]);
        // app.SendUpdate("pady", value[1]);
        app.SendUpdate("pad", [value[0], value[1]]);
      }
    })
    .css({ border: "1px solid #BBB" });

  var query = getQueryParams(document.location.search);
  console.log(query);
  app.showAdmin = typeof query.admin != "undefined" ? query.admin : false;
  app.showClient = typeof query.client != "undefined" ? query.client : true;
  app.showClient = app.showClient === "0" ? false : app.showClient
});

var currButton
var currButtonEle
var mouseDown = false


$(".btn").on("touchstart mousedown", function(e) {
  var e = event || window.event;
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
  let but = e.target.id;
  currButtonEle = e.target;
  $(this).addClass("down");

  mouseDown = true;
  currButton = e.target.id;
  app.SendUpdate(currButton,1)

});

$(".btn").on("touchend touchcancel", function(e) {
  var e = event || window.event;
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();

  let currButton = e.target.id
  $(this).removeClass("down");

  mouseDown = false;
   app.SendUpdate(currButton,0)
});

/*
$(".btn").on("mouseup", function(e) {
  if (!mouseDown) {
    var e = event || window.event;
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();
    $(this).removeClass("down");
    mouseDown = false;
  }
});*/

$(document).on("mouseup", function(e) {
  if (mouseDown) {
    $(this).removeClass("down");
    let currButton = e.target.id
    app.SendUpdate(currButtonEle.id,0)
    $(currButtonEle).removeClass("down");
    mouseDown = false;
  }
});
