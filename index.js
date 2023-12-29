const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bp = require('body-parser');

mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
  console.log('database connected.')
}).catch((err) => console.log(err.message));

//Importing MongoDB Models for Users and Exercises, and custom function Search
const User = require('./models/user');
const Exercise = require('./models/exercise');
const Search = require('./actions/usersearch.js')

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use("/api/users", bp.urlencoded({extended: false}));
app.use(bp.json());

//Exercise Tracker Add New Users and View All Users
app.route('/api/users')
  //Viewing a list of user without displaying their auth key #Custom Search.listUser function
   .get((req, res) => {
      Search.listUser()
            .then(list => {
              res.send(list);
            })
            .catch(err => {
                console.log(err);
                res.send("An Error has occured.");
    });
   }) 
  //HTML form
   .post((req,res) => {
     const user = req.body.username;
     User.findOne({username: user}, (err, found) => {
       if (err) {
         console.log(err);
         return;
       }
       //Check if user exists
       if (found) {
         res.json({"username": found.username, "_id": found._id, "Status": "Existing User Found"});
       } else {
         //If not, create new user
         const newuser = new User (
           {username: user}
         );
         newuser.save()
                .then(saved => {
                  res.json({"username": saved.username, "_id": saved._id, "AuthKey": saved.authKey, "Status": "New User Created! Save your AuthKey! Currently there is no way to retrieve your AuthKey!"})
                })
                .catch(err => {
                  console.log(err);
                  res.send("An error has occured!");
                });
       }
     });
   });

//#Exercise Tracker Log Exercises
app.post('/api/users/:_id/exercises', (req, res) => {
     //#Variables from the html form
      const userId = req.body[':_id'] || req.params['_id'];
      const userAuthKey = req.body.authkey;
      const exDesc = req.body.description;
      const exDura = req.body.duration;
      const exDate = req.body.date;
      const validId = /^[a-f\d]{24}$/;
      //#check if user ID is the correct format (MongoDB Obj ID, hex24)
      if (validId.test(userId) === false) {
        res.send("Invalid UserID Format. It must be a single String of 12 bytes or a string of 24 hex characters");
      } else {
        //#If ID is correct format, check if user exists
      User.findOne({_id: userId}, (err, found) => {
        if (!found) {
              res.send("User Not Found. Please Register with 'Create a New User'.");
            } else {
              //#if user exists, check if their auth key is correct
              if (userAuthKey !== found.authKey) {
                  res.status(403).send("Auth Key Incorrect");
                } else { 
                  //#if their auth key is correct, log user's exercise event
                  const newExercise = new Exercise ({
                      username: found.username,
                      description: exDesc,
                      duration: exDura,
                    });
                  //#if date is entered, register the entered date, otherwise it defaults
                  if (exDate) {
                    newExercise.date = exDate;
                  }
                  //#save and response the json
                  newExercise.save()
                             .then(saved => {
                               res.json({
                                 _id: userId,
                                 username: saved.username,
                                 description: saved.description,
                                 duration: saved.duration,
                                 date: saved.date.toDateString()
                               });
                             })
                             .catch(err => {
                               console.log(err);
                               res.send("An Error has occured.");
                             });
                }
            }
      });       
   }
});

//Exercise Tracker Get User Exercise Log
app.route('/api/users/:_id/logs')
   .get((req, res) => {
     const id = req.params._id;
     let from = req.query.from;
     let to = req.query.to;
     let limit = req.query.limit;

     if (from) {
    from = new Date(from);
    if (from == "Invalid Date") {
      res.json("Invalid Date Entered");
      return;
    }
  }

  if (to) {
    to = new Date(to);
    if (to == "Invalid Date") {
      res.json("Invalid Date Entered");
      return;
    }
  }
     
     User.findOne({_id: id}, (err, found) => {
       //if user does not exist
       if (!found) {
          res.send("User Not Found. Please Register with 'Create a New User'.");
        } else {
          const usernameFound = found.username;
          var objToRtr = {_id: id, username: usernameFound};
          var logFilter = {username: usernameFound};
          var dateFilter = {};
          if (limit == null) {
            limit = 999;
          }
          if (from) {
            dateFilter["$gte"] = from;
            if (to) {
              dateFilter["$lte"] = to;
            } else {
              dateFilter["$lte"] = Date.now();
            }
          }
         if (to) {
            dateFilter["$lt"] = to;
            dateFilter["$gte"] = new Date("1990-01-01");
         }

         if (to || from) {
          logFilter.date = dateFilter;
          }

         Exercise.countDocuments(logFilter, (err, data) => {
           if (err) {return console.log(err);}
           let count = data;
           if (limit && limit < count) {
             count = limit;
           }
           objToRtr["count"] = count;

           Exercise.find(logFilter, (err, data) => {
             if (err) {return console.log(err);}

             let logArray = [];
             let subObj = {};
             let count = 0;

             data.forEach((item) => {
               count += 1;
               if (!limit || count <= limit) {
                 subObj = {};
                 subObj.description = item.description;
                 subObj.duration = item.duration;
                 subObj.date = item.date.toDateString();
                 logArray.push(subObj);
               }
             });

             objToRtr["log"] = logArray;

             res.json(objToRtr);
           });
         });
        }
     });  
   });

//include total exercise count by objects retrieved

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})