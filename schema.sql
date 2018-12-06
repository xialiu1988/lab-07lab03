DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS weathers;
DROP TABLE IF EXISTS yelps;
DROP TABLE IF EXISTS movies;



CREATE TABLE locations(
 id SERIAL PRIMARY KEY,
 search_query VARCHAR(255),
 formatted_query VARCHAR(255),
 latitude NUMERIC (8,6),
 longitude NUMERIC (9,6)
);

CREATE TABLE weathers(
id SERIAL PRIMARY KEY,
forecast VARCHAR(255),
time VARCHAR(255),
location_id INTEGER NOT NULL,
FOREIGN KEY(location_id) REFERENCES locations(id)
);

CREATE TABLE yelps(
id SERIAL PRIMARY KEY,
name VARCHAR(255),
rating VARCHAR(255),
price VARCHAR(255),
image_url VARCHAR(255),
location_id INTEGER NOT NULL,
FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE movies(
id SERIAL PRIMARY KEY,
title VARCHAR(255),
overview VARCHAR(255),
average_votes VARCHAR(255),
total_votes VARCHAR(255),
image_url VARCHAR(255),
release_date VARCHAR(255),
popularity VARCHAR(255),
released_on VARCHAR(255),
location_id INTEGER NOT NULL,
FOREIGN KEY (location_id) REFERENCES locations(id)
);