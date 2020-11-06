var socket = io();
socket.emit("logged", "holis");

var app = new Vue({
  el: '#app',
  data: {
    serverRequest: false,
    slider01:0,
    slider02:0,
    slider03:0,
    conectados:0
    
  },
  watch:{
    slider01:function(){
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
    },
  },
  methods:{
    ClickedBut:function(param){
      console.log("Clicked But ",param)
      socket.emit("clickedBut", {parameter:param,value:1})
    }
  }
})




socket.on("valueChange", function(data){
  console.log("Server Request",data)
  app.serverRequest = true
  app[data.parameter] = data.value
})

socket.on("clickedBut", function(data){
  console.log("Server Request",data)
})



// admin url get
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
if(urlParams.has("admin")){
  app._data.admin=true
}