const express = require('express');
const router = express.Router();
const {
  ensureAuthenticated
} = require('../config/auth')
const User = require("../models/user");
const bcrypt = require('bcrypt');
const passport = require('passport');
// landing page
router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/experiencia');
  } else {
    res.render('home');
  }

})

// dashboard
router.get('/experiencia', ensureAuthenticated, (req, res) => {
  res.render('experiencia', {
    user: req.user
  });
})


//login handle
router.get('/login', (req, res) => {
  res.render('login');
})
router.get('/registrar', (req, res) => {
  res.render('registrar')
})

//Register handle
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/experiencia',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next)
})

//register post handle
router.post('/registrar', (req, res) => {
  const {
    name,
    email,
    password,
    password2
  } = req.body;
  let errors = [];
  console.log(' Name ' + name + ' email :' + email + ' pass:' + password);
  if (!name || !email || !password || !password2) {
    errors.push({
      msg: "Por favor llená todos los campos"
    })
  }
  //check if match
  if (password !== password2) {
    errors.push({
      msg: "Contraseñas no coinciden"
    });
  }

  //check if password is more than 6 characters
  if (password.length < 6) {
    errors.push({
      msg: 'Contraseña debe tener al menos 6 caracteres'
    })
  }
  if (errors.length > 0) {
    res.render('registrar', {
      errors: errors,
      name: name,
      email: email,
      password: password,
      password2: password2
    })
  } else {
    //validation passed
    User.findOne({
      email: email
    }).exec((err, user) => {
      console.log(user);
      if (user) {
        errors.push({
          msg: 'Ya existe una cuenta con ese email'
        });
        res.render('registrar', {
          errors,
          name,
          email,
          password,
          password2
        })
      } else {
        const newUser = new User({
          name: name,
          email: email,
          password: password
        });

        //hash password
        bcrypt.genSalt(10, (err, salt) =>
          bcrypt.hash(newUser.password, salt,
            (err, hash) => {
              if (err) throw err;
              //save pass to hash
              newUser.password = hash;
              //save user
              newUser.save()
                .then((value) => {
                  console.log(value)
                  // req.flash('success_msg','Ya estás registrado!');
                  // res.redirect('/login');
                  // TODO autologin acá
                  // passport.authenticate('local',{
                  //     successRedirect : '/experiencia',
                  //     failureRedirect: '/login',
                  //     failureFlash : true
                  // })(req,res,next)
                  req.login(newUser, function(err) {
                    if (!err) {
                      res.redirect('/experiencia');
                    } else {
                      //handle error
                    }
                  })
                })
                .catch(value => console.log(value));

            }));
      }
    })
  }
})

//logout
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'Deslogueado correctamente');
  res.redirect('/login');
})


module.exports = router;
