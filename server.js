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

function getLocation(request,response){
  const locationHandler={
    query:request.query.data,
    cacheHit:(results)=>{
      response.send(results.rows[0]);
    },
    cacheMiss:()=>{
      Location.getlocationinfo(request.query.data)
        .then(data=>response.send(data));
    },
  };


  Location.findLocation(locationHandler);

}

//LOcation constructor
function Location(query,data){
  this.search_query=query;
  this.formatted_query=data.formatted_address;
  this.latitude=data.geometry.location.lat;
  this.longitude=data.geometry.location.lng;
}

//get location information and save the info to db

Location.getlocationinfo=(query)=>{
  const _URL=`https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;
  return superagent(_URL)
    .then(data=>{

      if(!data.body.results.length){throw 'NO DATA';}
      else{
        let location=new Location(query,data.body.results[0]);
        return location.save()
          .then(result=>{
            location.id=result.rows[0].id;
            return location;
          })
        return location;
      }

    })
};


//save info to db
Location.prototype.save=function(){
  let SQL=  `INSERT INTO locations

       
(search_query,formatted_query,latitude,longitude)
VALUES($1,$2,$3,$4)
RETURNING id;
`;
  let values=Object.values(this);
  return client.query(SQL,values);


}
//find info about location from db
Location.findLocation=(handler)=>{

  const SQL=`SELECT * FROM locations WHERE search_query=$1`;
  const values=[handler.query];

  return client.query(SQL,values)
    .then(results=>{
      if(results.rowCount>0){
        handler.cacheHit(results);
      }
      else{
        handler.cacheMiss();
      }
    })
    .catch(error => handleError(error));

};


//weather starts here

//weather constructor
function Weather(day){
  this.forcast=day.summary;
  this.time=new Date(day.time*1000).toString().slice(0,15);
}


function getWeather(request,response){
  const weatherHandler={
    location:request.query.data,
    cacheHit:function(result){
      response.send(result.rows);
    },
    cacheMiss:function(){
      Weather.getWeatherinfo(request.query.data)
        .then(results=>response.send(results))
        .catch(error => handleError(error));
    },

  };

  Weather.findWeather(weatherHandler);

}
//save weather info to db
Weather.prototype.save=function(id){
  const SQL=`INSERT INTO weathers (forecast, time, location_id) VALUES ($1, $2, $3);`;
  const values=Object.values(this);
  values.push(id);
  client.query(SQL,values);
};



Weather.findWeather=function(handler){
  const SQL= `SELECT * FROM weathers WHERE location_id=$1;`;
  client.query(SQL,[handler.location.id])
    .then(result=>{
      if(result.rowCount>0){
        handler.cacheHit(result);
      }
      else{
        handler.cacheMiss();
      }
    })
    .catch(error => handleError(error));
};



Weather.getWeatherinfo=function(location){

  const url=`https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${location.latitude},${location.longitude}`;

  return superagent.get(url)
    .then(result=>{
      const weatherSummaries=result.body.daily.data.map(day=>{

        const summary =new Weather(day);
        summary.save(location.id);
        return summary;
      });
      return weatherSummaries;
    });

};





//error handler
function handleError(err,res){
  console.err('ERR',err);
  if(res) res.status(500).send('sorry broken ');
}


app.listen(PORT,()=>{});
