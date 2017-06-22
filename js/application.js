/*
 * Local Weather app Javascript
 */

// globals
var userPosition = {
  "latitude": 0.0,
  "longitude": 0.0
};

var localWeather;

// jQuery start -------------------------------------------
$(document).ready(function () {
  // get location
  requestUserLocation();
});

// events -------------------------------------------------
function requestUserLocation() {
  // try to retrieve location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      userPosition.latitude = position.coords.latitude;
      userPosition.longitude = position.coords.longitude;

      onUserLocation();
    });
  } else {
    userPosition.latitude = 37.77;
    userPosition.longitude = -122.42;

    onUserLocation();
  }
}

function onUserLocation() {
  localWeather = new LocalWeather(userPosition.latitude, userPosition.longitude);
  localWeather.collectWeather(onWeatherCollected);
}

function onWeatherCollected() {
  // location
  $("#location").html(localWeather.getPoint().getRelativeLocation());

  // current conditions
  var stationInfo = localWeather.getStationObservation().getStationInfo();
  var observation = localWeather.getStationObservation().getObservation();
  console.log(stationInfo);
  console.log(observation);

  $("#current-img").html(createCurrentImg(observation.icon, observation.message));
  $("#current-txt").html(createCurrentHtml(stationInfo, observation));
}

function createCurrentHtml(stationInfo, observation) {
  var html = "<h4>" + observation.message + "</h4>\n"
  html += "<strong>Temperature:</strong> " + observation.tempC + "<br>";
  html += "<strong>Station:</strong> " + stationInfo.id + " - " + stationInfo.name + "<br>";

  return html;
}

function createCurrentImg(iconUri, alt) {
  return "<img class='img-responsive' src='" + getIconURI(iconUri, "l") + "' alt='" + alt + "'>";
}

function createForecastImg(iconUri, alt) {
  return "<img src='" + getIconURI(iconUri, "s") + "' alt='" + alt + "'>";
}

function getIconURI(rawURI, size) {
  var unsizedUri = rawURI.split("?")[0];

  switch (size) {
    case "small":
    case "s":
      return unsizedUri + "?size=small";

    case "medium":
    case "m":
      return unsizedUri + "?size=medium";

    case "large":
    case "l":
      return unsizedUri + "?size=large";

    default:
      return unsizedUri;
  }
}

// prototypes ---------------------------------------------

var LocalWeather = function(latitude, longitude) {
  var point = new LWPoint(latitude, longitude);
  var pointForecast;
  var stationObservation;
  var finalCallback;

  // public
  this.collectWeather = function(callback) {
    finalCallback = callback;
    point.fetch(havePoint);
  };

  this.getPoint = function() { return point; };
  this.getStationObservation = function() { return stationObservation; };

  // private
  var havePoint = function() {
    stationObservation = new LWObservation(point);
    stationObservation.fetch(haveObservation);
  };

  var haveObservation = function() {
    finalCallback();
  };
};

var LWPoint = function(latitude, longitude) {
  var lat = latitude;
  var lon = longitude;
  var city;
  var state;
  var stations;
  var callback;

  // public
  this.latitude = function() { return lat; };
  this.longitude = function() { return lon; };

  this.fetch = function(cb) {
    console.log("Starting point fetch");
    callback = cb;
    var uri = "https://api.weather.gov/points/" + lat + "," + lon;
    $.getJSON(uri, onPoint);
  };

  this.getRelativeLocation = function() {
    return city + ", " + state;
  };

  this.getStationsURI = function() {
    return stations;
  };

  // private
  var onPoint = function(point) {
    console.log(point);
    city = point.properties.relativeLocation.properties.city;
    state = point.properties.relativeLocation.properties.state;
    stations = point.properties.observationStations;

    callback();
  };
};

var LWObservation = function(lwPoint) {
  var point = lwPoint;
  var station;
  var observation;
  var callback;

  // public
  this.fetch = function(cb) {
    console.log("Starting point stations fetch");
    callback = cb;
    $.getJSON(point.getStationsURI(), onStations);
  };

  this.getStationInfo = function() {
    return station;
  };

  this.getObservation = function() {
    return observation;
  };

  // private
  var onStations = function(stations) {
    console.log(stations);
    console.log("Starting station fetch");
    var obsUri = stations.observationStations[0];
    $.getJSON(obsUri, onStation);
  };

  var onStation = function(s) {
    console.log(s);
    station = {
      "id": s.properties.stationIdentifier,
      "name": s.properties.name
    };

    console.log("Starting current observation fetch");
    $.getJSON(s.id + "/observations/current", onObservation);
  };

  var onObservation = function(o) {
    console.log(o);
    observation = {
      "icon": o.properties.icon,
      "message": o.properties.textDescription,
      "tempC": o.properties.temperature.value,
      "humidity": o.properties.relativeHumidity.value,
      "windSpeed": o.properties.windSpeed.value
    };

    callback();
  };
};
