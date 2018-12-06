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
  let SQL= `INSERT INTO locations   
(search_query,formatted_query,latitude,longitude)
VALUES($1,$2,$3,$4)
RETURNING id
`;
  let values=Object.values(this);
  return client.query(SQL,values);


};
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
  this.forecast=day.summary;
  this.time=new Date(day.time*1000).toDateString();

}


function getWeather(request,response){
  const handler={
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

  Weather.findWeather(handler);

}
//save weather info to db
Weather.prototype.save=function(id){
  const SQL=`INSERT INTO weathers (forecast,time,location_id) VALUES ($1,$2,$3);`;
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

        const summary = new Weather(day);
        summary.save(location.id);
        return summary;
      });
      return weatherSummaries;
    });

};




//yelp starts here

app.get('/yelp',getYelp);

//yelp constructor

function Yelp(item){
  this.name=item.name;
  this.rating=item.rating;
  this.price=item.price;
  //   this.phone=item.phone;
  this.image_url=item.image_url;

}


function getYelp(request,response){
  const handler={
    location: request.query.data,
    cacheHit: function(result){
      response.send(result.rows);
    },
    cacheMiss: function(){
      Yelp.getYelpinfo(request.query.data)
        .then(results=>response.send(results))
        .catch(console.error);
    },

  };

  Yelp.findYelp(handler);

}

//save to db
Yelp.prototype.save=function(id){
  const SQL = `INSERT INTO yelps (name,rating,price,image_url) VALUES ($1,$2,$3,$4);`;
  const values=Object.values(this);
  values.push(id);
  client.query(SQL,values);
};




Yelp.findYelp=function(handler){
  const SQL= `SELECT * FROM yelps WHERE name=$1`;
  client.query(SQL,[handler.location.id])
    .then(result=>{
      if(result.rowCount>0){
        handler.cacheHit(result);
      }
      else{
        handler.cacheMiss();
      }
    });
   
};


Yelp.getYelpinfo=function(location){

  const url= `https://api.yelp.com/v3/businesses/search?location=${location.latitude},${location.longitude}`;
  return superagent.get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(result=>{
      const yelpSummaries=result.body.businesses.map(item=>{

        const summary =new Yelp(item);
        summary.save(location.id);
        return summary;
      });
      return yelpSummaries;
    });

};

//movie starts here
app.get('/movies',getMovies);

function Movie(item){
  this.title=item.title;
  this.overview=item.overview;
  this.average_votes=item.vote_average;
  this.total_votes=item.vote_count;
  this.image_url='https://image.tmdb.org/t/p/w370_and_h556_bestv2/' + item.poster_path;
  this.release_date=item.release_date;
  this.popularity=item.popularity;
  this.released_on=item.release_data;

}

function getMovies(request,response){
  const handler={
    location: request.query.data,
    cacheHit: function(result){
      response.send(result.rows);
    },
    cacheMiss: function(){
      Movie.getMovieinfo(request.query.data)
        .then(results=>response.send(results))
        .catch(console.error);
    },

  };

  Movie.findMovie(handler);

}


Movie.prototype.save=function(id){
  const SQL = `INSERT INTO movies (title,overview,average_votes,total_votes,image_url,release_date,popularity,released_on) VALUES ($1,$2,$3,$4,$5,$6,$7,$8);`;
  const values=Object.values(this);
  values.push(id);
  client.query(SQL,values);
};



Movie.findMovie=function(handler){
  const SQL= `SELECT * FROM movies WHERE title=$1`;
  client.query(SQL,[handler.location.id])
    .then(result=>{
      if(result.rowCount>0){
        handler.cacheHit(result);
      }
      else{
        handler.cacheMiss();
      }
    });
   
};



Movie.getMovieinfo=function(location){

  const url= `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${location.search_query}`;
  return superagent.get(url)
    .then(resultupdate=>{
      const movieSummaries=resultupdate.body.results.map(item=>{

        const summary =new Movie(item);
        summary.save(location.id);
        return summary;
      });
      return movieSummaries;
    });

};





//error handler
function handleError(err,res){
//   console.err('ERR',err);
  if(res) res.status(500).send('sorry broken ');
}


app.listen(PORT,()=>{});
