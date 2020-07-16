const axios = require('axios');
const express = require('express');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const server = express();
const path = require('path');
const filemgr = require('./filemgr');
const port = process.env.PORT || 3000;

server.use(express.static(__dirname + '/public'));
server.use(bodyParser.urlencoded({extended: true}));
server.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/views/partials');

const PLACES_API_KEY = 'AIzaSyCzL86-0uobcrC9pKekXarOSJzqrrg3Igw';
var filteredResults;

hbs.registerHelper('list', (items, options) => {
  items = filteredResults;
  var out ="<thead class='thead-light'><tr><th>Name</th><th>Address</th><th>Photo</th></tr></thead>";

  const length = items.length;

  for(var i=0; i<length; i++){
    out = out + options.fn(items[i]);
  }

  return out;
});

server.get('/', (req, res) => {
  res.render('home.hbs');
});

server.get('/form', (req, res) => {
  res.render('form.hbs');
});

server.post('/getplaces',(req, res) => {
  const addr = req.body.address;
  const placetype = req.body.placetype;
  const name = req.body.name;
  const locationReq =`https://maps.googleapis.com/maps/api/geocode/json?address=${addr}&key=AIzaSyARTSq38TuS9s6hfivOnbfpKYBfNsI6CHI`;

  axios.get(locationReq).then((response) => {
    const locationData = {
      addr: response.data.results[0].formatted_address,
      lat:  response.data.results[0].geometry.location.lat,
      lng:  response.data.results[0].geometry.location.lng,
    }

    const placesReq = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${locationData.lat},${locationData.lng}&radius=1500&types=${placetype}&name=${name}&key=${PLACES_API_KEY}`;


    return axios.get(placesReq);
  }).then((response) => {

    filteredResults = extractData(response.data.results);

    filemgr.saveData(filteredResults).then((result) => {
      res.render('result.hbs');
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    //res.status(200).send(filteredResults);

  }).catch((error) => {
    console.log(error);
  });
});

server.get('/historical', (req, res) => {
  filemgr.getAllData().then((result) => {
    filteredResults = result;
    console.log(filteredResults[0]);
    res.render('historical.hbs');
  }).catch((errorMessage) =>{
    console.log(errorMessage);
  });
});

server.post('/delete', (req, res) => {
  filemgr.deleteAll().then((result) => {
    filteredResults = result;
    res.render('historical.hbs');
  }).catch((errorMessage) => {
    console.log(errorMessage);
  });
})

const extractData = (originalResults) => {
  var placesObj = {
    table : [],
  };

  const length = originalResults.length;

  for (var i=0; i<length; i++){
    if (originalResults[i].photos) {
      const photoRef = originalResults[i].photos[0].photo_reference
      const requestUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${PLACES_API_KEY}`;
      tempObj = {
        name: originalResults[i].name,
        address: originalResults[i].vicinity,
        photo_reference: requestUrl,
      }
    } else {
      tempObj = {
        name: originalResults[i].name,
        address: originalResults[i].vicinity,
        photo_reference: '/noimage.jpg',
      }
    }
    placesObj.table.push(tempObj);
  }
  return placesObj.table;
};

server.listen(port, () =>{
  console.log(`Server started on port ${port}`)
});
