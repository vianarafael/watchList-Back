const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const axios = require('axios');
const { Client } = require('pg');

const session = require('express-session');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
let saltRounds = 10;


const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors({
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST"],
  credentials: true
}));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  key: "userId",
  secret: "secret",
  resave: false,
  saveUninitialiazed: false,
  cookie: {
    expires: new Date(Date.now() + 60 * 10000)
  }
}))

// database connection
const client = new Client({
  user: "postgres",
  host: "localhost",
  password: "sharck",
  database: "test"
});

client.connect();

app.get('/', (req, res) => {
  res.send('hi')
})

app.post('/register', (req, res) => {

  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    if (err) console.log(err);
    client.query(`INSERT INTO users (username, password) VALUES('${req.body.username}', '${hash}');`, (err, a) => {
      // the server breaks easily
      if (err) console.log(err)
  
    });
  })

});

const verifyJWT = (req, res, next) => {
  const token = req.headers["x-access-token"];
  if(!token) {
    res.send("No token provided");
  } else {
    jwt.verify(token, "secretKey", (err, decoded) => {
      if (err) res.json({auth: false, message: "Authentication failed"});
      else {
        req.userId = decoded.id;
        next();
      }
    })
  }
}

app.get('/isAuth', verifyJWT, (req, res) => {
  res.send("Authenticated");
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    res.send({auth: true, user: req.session.user});
  } else {
    res.send({auth: false})
  }
})

app.post('/login', (req, res) => {

  client.query(`SELECT * FROM users WHERE username = '${req.body.username}';`, (err, result) => {
    if (err) console.log(err)

    if (result.rows.length) {
      bcrypt.compare(req.body.password, result.rows[0].password, (error, response) => {
        if (response) {

          const username = result.rows[0].username;
          const id = result.rows[0].uid;
          const token = jwt.sign({id}, "secretKey", {
            expiresIn: 300
          }); // the secretKey has to be a .env

          req.session.user = result;
  
          res.json({auth: true, token, data: { id, username }});
        } else {
          res.send({auth: false, message: "Wrong username/password combination"});
        }
      })

    } else {
      res.send({auth: false, message: "Not Found"})
    }

  });

})

app.get("/movies/:id", verifyJWT, (req, res) => {
  // this should be a DB connection that will return the fav movies from a user
  const uid = req.params.id;
  client.query(`SELECT * FROM movies WHERE user_id = ${uid}`, (err, response) => {
    res.send(response);
  })
})

app.post("/addMovie/:id", (req, res) => {
  const movieId = req.params.id;
  const token = req.query.token
  jwt.verify(token, 'secretKey', (err, decoded) => {
    if (err)  {
      console.log(err)
    } else {
      const userId = decoded.id;
      client.query(`INSERT INTO movies(mid, user_id) VALUES(${movieId}, ${userId})`, (err, response) => {
      if (err) { 
        console.log(err);
      } else {
        res.send({message: "Movie added to WatchList"})
      }
  })

    }
  });
})


app.delete("/removeMovie/:id", (req, res) => {
  console.log(req.body, req.params)
  const userId = req.body.uid;
  const movieId = req.params.id;
  client.query(`DELETE FROM movies WHERE mid=${movieId} AND user_id=${userId}`, (err, response) => {
    if (err) {
      console.log(err);
    } else {
      res.send(response);
    }
  })
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
