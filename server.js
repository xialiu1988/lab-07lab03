'use strict';

const express=require('express');
const cors=require('cors');
const app=express();
app.use(cors());

const superagent=require('superagent');
const pg=require('pg');

require('dotenv').config();
const PORT=process.env.PORT||3000;


//setup databse

const client=new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('err',err=>console.log(err));

//start dealing with incoming request

app.get('/location',getLocation);
app.get('/weather',getWeather);


//MAKE REQUEST OR PULL FROM CACHE












//error handler
function handleError(err,res){
  console.err('ERR',err);
  if(res) res.status(500).send('sorry broken ');
}


app.listen(PORT,()=>{});
