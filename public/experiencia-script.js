var socket = io();
socket.emit("logged", "holis");

var colorSlider = VueColor.Slider;

let defaultColor = Object.assign({}, this.colors, {
  a: 1,
  hex: "#ffffff"
})

var app = new Vue({
  el: "#app",
  components: {
    "slider-picker": colorSlider
  },
  data: {
    loaded: false,
    showOthers: false,
    currentTab: 1,

    id: -1,
    players: [],

    color: defaultColor,
    nombre: "",

    sala: {
      state: 0,
      countdownTs: 0,
      countdownTxt: "",
      duracionTs: 0,
      duracionTxt: "",
      errTxt: "",
      avisoInactividad: false,
      permitirReconectar: false
    },



    // borrar esto
    slider01: 0,
    slider02: 0,
    slider03: 0,

    conectados: 0,

    showClient: true,
    showAdmin: false,
    conexionDuplicada: false
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
    },
  },
  computed: {},
  methods: {
    resetPlayerArr: function() {
      this.players = [];
    },
    newPlayer: function(data) {
      console.log("newPlayer", data);
      this.players.push(data);
    },

    deletePlayer: function(data) {
      console.log("deletePlayer", data);
      this.players.find((o, i) => {
        if (typeof o != "undefined" && o.id == data) {
          this.players.splice(i, 1);
          return true; // stop searching
        }
      });
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
    },

    TickCountdownTimer: function(){
      this.sala.countdownTxt = FormatTimeDiff(this.sala.countdownTs)
      if(this.sala.state == 1){
        setTimeout(this.TickCountdownTimer, 400);
      }
    },
    TickDuracionTimer: function(){
      this.sala.duracionTxt = FormatTimeDiff(this.sala.duracionTs)
      if(this.sala.state == 2){
        setTimeout(this.TickDuracionTimer, 400);
      }
    },
    Reconectar: function(){
      this.sala.permitirReconectar=false
      console.log("reconectando")
      socket.emit("juego:reconectar", { id: this.id });

    }
  },
  mounted: function() {
    switch (getAnchor()) {
      case 'pantalla1':
        this.currentTab = 1
        break;

      case 'pantalla2':
        this.currentTab = 2
        break;

      case 'pantalla3':
        this.currentTab = 3
        break;

      case 'otres':
        this.currentTab = 4
        break;
      default:

    }
  }
});

// MENSAJES DEL SERVIDOR
socket.on("disconnect", function() {
  console.warn("Client disconnecting");
  app.resetPlayerArr();
});


socket.on("loginData", function(data) {
  // Recibo mi data de login
  console.log("loginData", data)
  app.id = data.id
  app.color = Object.assign({}, this.colors, {
    a: 1,
    hex: data.color
  })
  app.loaded = true
})

socket.on("newPlayer", function(data) {
  // Un player nuevo
  console.log("newPlayer", data);
  app.newPlayer(data);
});

socket.on("deletePlayer", function(data) {
  // Un player se fue y lo borro de la lista
  app.deletePlayer(data.userId);
});

socket.on("otherUpdate", function(data) {
  console.log("otherUpdate", data);
  app.OtherUpdate(data);
});

socket.on("conexionDuplicada", function(data) {
  app.conexionDuplicada = true
  console.log("CONEXION DUPLICADA", data)
})


// Logica Juego
socket.on("juego:espera", function(data) {
  // console.log("ENTRE A SALA DE ESPERA", data)
  app.sala.state = 0
})
socket.on("juego:countdown", function(data) {
  // console.log("ESTA POR COMENZAR EL JUEGO", data)
  app.sala.state = 1
  app.sala.countdownTs = data.timestamp
  app.TickCountdownTimer()
})
socket.on("juego:comienza", function(data) {
  // console.log("COMIENZA EL JUEGO", data)
  app.sala.state = 2
  app.sala.duracionTs = data.timestamp
  app.TickDuracionTimer()
})
socket.on("juego:termino", function(data) {
  // console.log("TERMINÓ EL JUEGO", data)
  app.sala.state = 3
  app.sala.avisoInactividad = false
})

socket.on("juego:avisoInactividad:on", function(data) {
  app.sala.avisoInactividad = true
})
socket.on("juego:avisoInactividad:off", function(data) {
  app.sala.avisoInactividad = false
})

socket.on("juego:inactividad", function(data) {
  console.warn(data.error)
  app.sala.state = 'err'
  app.sala.errTxt = data.error
  alert(data.error)
  app.sala.permitirReconectar = typeof(data.permitirReconectar)!=='undefined' ? data.permitirReconectar : false
  app.sala.avisoInactividad = false
})


socket.on("juego:participacionMaxima", function(data) {
  console.warn("Error entrando a sala", "NO PODÉS VOLVER A PARTICIPAR", data)
  app.sala.state = 'err'
  console.log(data)
  app.sala.errTxt = data.error
  app.sala.permitirReconectar = typeof(data.permitirReconectar)!=='undefined' ? data.permitirReconectar : false
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

function FormatTimeDiff(endTime){
  let duration = moment.duration(endTime - Date.now())
  let mins = duration.minutes()
  let secs = duration.seconds()
  secs = secs > 9 ? secs : "0"+secs
  return  mins + ":" + secs;
}

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

function getAnchor() {
  var currentUrl = document.URL,
    urlParts = currentUrl.split('#');
  return (urlParts.length > 1) ? urlParts[1] : null;
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
    .css({
      border: "1px solid #BBB"
    });

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
  app.SendUpdate(currButton, 1)

});

$(".btn").on("touchend touchcancel", function(e) {
  var e = event || window.event;
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();

  let currButton = e.target.id
  $(this).removeClass("down");

  mouseDown = false;
  app.SendUpdate(currButton, 0)
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
    app.SendUpdate(currButtonEle.id, 0)
    $(currButtonEle).removeClass("down");
    mouseDown = false;
  }
});
