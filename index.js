const express = require('express')
const app = express()
const cors = require('cors')
const {v4} = require('uuid')
var fs = require('fs');
require('dotenv').config()

app.use(express.urlencoded({extended:true}))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const readDatabase = ()=>{
  return new Promise((resolve,reject)=>{
    fs.readFile('database.json', 'utf8', (err, database)=>{
        if (err){
            reject(err)
        } else {
          let obj = JSON.parse(database); //now it an object
          resolve(obj);
    }});
  })
}

const writeToDatabase = (obj)=>{
  let json = JSON.stringify(obj); //convert it back to json
  return new Promise((resolve,reject)=>{
    fs.writeFile('database.json', json, 'utf8', (err)=>{
      if(err) reject(err)
      else resolve();
    }); // write it back 
  })
}


const newUser=(name)=>{
  return new Promise((resolve,reject)=>{
    readDatabase().then((obj)=>{
      let id = v4();
      obj['users'][id] = {
        "username":name,"_id":id
      }
      writeToDatabase(obj).then(()=>resolve(obj['users'][id])).catch((err)=>reject(err));
    }).catch(err=>reject(err))
  })
}

const newExercise=(id,description,duration,dateStr='')=>{
  return new Promise((resolve,reject)=>{
    readDatabase().then((obj)=>{
      let date = dateStr?new Date(dateStr).toDateString():new Date().toDateString();
      if(obj['exercises'][id]){
        obj['exercises'][id].push({
          "description":description,"duration":parseInt(duration),"date":date
        });
      }
      else{
        obj['exercises'][id] = [{
          "description":description,"duration":parseInt(duration),"date":date
        }]
      }
      let res = {
        username: obj['users'][id]['username']?obj['users'][id]['username']:'Dano',
        description: description,
        duration: parseInt(duration),
        date: date,
        _id: id
      }
      writeToDatabase(obj).then(()=>resolve(res)).catch((err)=>reject(err));
    }).catch(err=>reject(err))
  })
}

const readLogs = (id,from, to, limit)=>{
  return new Promise((resolve,reject)=>{
    readDatabase().then((obj)=>{
      if(obj['users'][id]){
        let exercises = obj['exercises'][id]?obj['exercises'][id]:new Array();
        if(exercises.length>0){
          if(from){
            let fromDate = new Date(from);
            exercises = exercises.filter((exercise)=>{
              let exerciseDate = new Date(exercise.date);
              return fromDate<=exerciseDate;
            })
          }
          if(to){
            let toDate = new Date(to);
            exercises = exercises.filter((exercise)=>{
              let exerciseDate = new Date(exercise.date);
              return toDate>=exerciseDate;
            })
          }
          if(limit){
            limit = parseInt(limit);
            exercises = exercises.slice(0,limit);
          }//from 2022-5-13 to 2022-6-27
        }
        let res= {
          username: obj['users'][id]['username'],
          count: exercises.length,
          _id: id,
          log: exercises
        }
        resolve(res)
      }
      else{
        resolve({user:'Not found'})
      }
    }).catch((err)=>reject(err));
  })
}

app.post('/api/users',(req,res)=>{
  newUser(req.body.username).then((result)=>res.json(result)).catch((err)=>res.send(err))
  
});
app.get('/api/users',(req,res)=>{
  readDatabase().then((result)=>{
    let users = Object.keys(result['users']).map((key)=>{
      return result['users'][key];
    })
    res.json(users)
  }).catch((err)=>res.send('err'))
  
});

app.post('/api/users/:_id/exercises',(req,res)=>{
  newExercise(req.params._id,req.body.description,req.body.duration,req.body.date)
    .then((result)=>res.json(result))
    .catch((err)=>res.send(err));
  
});

app.get('/api/users/:_id/logs',(req,res)=>{
  readLogs(req.params._id,req.query.from,req.query.to,req.query.limit)
    .then((result)=>res.json(result))
    .catch((err)=>res.send(err));
  
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
