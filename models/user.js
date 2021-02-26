const mongoose = require('mongoose');
const UserSchema  = new mongoose.Schema({
  name :{
      type  : String,
      required : true
  } ,
  email :{
    type  : String,
    required : true
  } ,
  password :{
      type  : String,
      required : true
  } ,
  date :{
      type : Date,
      default : Date.now
  },
  age:{
      type: Number
  },
  avatar:{
      type: Number,
      default:0
  },
  color:{
      type: String,
      default: "#ffffff"
  },
  participaciones:[
    {
      date : Date,
      puntos : Number
    },
  ]

});
const User = mongoose.model('User',UserSchema);

module.exports = User;
