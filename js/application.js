/*
 * Local Weather app Javascript
 */

// globals
var userPosition = {
  "latitude": 37.78,
  "longitude": -122.41
};

var localWeather;
var useF = true;

// jQuery start -------------------------------------------
$(document).ready(function () {
  // button setup
  setupDegButtons();
  $("#deg-f-btn").on("click", onDegFClick);
  $("#deg-c-btn").on("click", onDegCClick);

  $("#deg-f-btn").prop("disabled", true);
  $("#deg-c-btn").prop("disabled", true);

  // get location
  requestUserLocation();
});

function requestUserLocation() {
  // try to retrieve location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      userPosition.latitude = position.coords.latitude;
      userPosition.longitude = position.coords.longitude;

      onUserLocation();
    },
    function(err) {
      $("#current-txt").html("Failed to get current location; defaulting to San Francisco, CA...");
      onUserLocation();
    });
  } else {
    $("#current-txt").html("Unable to request location; defaulting to San Francisco, CA...");
    onUserLocation();
  }
}

// events -------------------------------------------------
function onDegFClick() {
  if (!useF) {
    useF = true;
    setupDegButtons();
    renderWeatherContent();
  }
}

function onDegCClick() {
  if (useF) {
    useF = false;
    setupDegButtons();
    renderWeatherContent();
  }
}

function onUserLocation() {
  localWeather = new LocalWeather(userPosition.latitude, userPosition.longitude);
  localWeather.collectWeather(onWeatherCollected);
}

function onWeatherCollected() {
  // render weather
  renderWeatherContent();

  // enable buttons
  $("#deg-f-btn").prop("disabled", false);
  $("#deg-c-btn").prop("disabled", false);
}

function renderWeatherContent() {
  // location
  $("#location").html(localWeather.getPoint().getRelativeLocation());

  // current conditions
  var stationInfo = localWeather.getStationObservation().getStationInfo();
  var observation = localWeather.getStationObservation().getObservation();
  var forecasts = localWeather.getPointForecast().getForecasts();
  // console.log(stationInfo);
  // console.log(observation);
  // console.log(forecasts);

  $("#current-img").html(createCurrentImg(observation.icon, observation.message));
  $("#current-txt").html(createCurrentHtml(stationInfo, observation));

  for (var i = 0; i < forecasts.length; i++) {
    createForecastContent(i + 1, forecasts[i]);
  }
}

// content creation ---------------------------------------
function setupDegButtons() {
  if (useF) {
    $("#deg-c-btn").removeClass("btn-info").addClass("btn-default");
    $("#deg-f-btn").removeClass("btn-default").addClass("btn-info");
  } else {
    $("#deg-f-btn").removeClass("btn-info").addClass("btn-default");
    $("#deg-c-btn").removeClass("btn-default").addClass("btn-info");
  }
}

function createForecastContent(num, forecast) {
  var imgId = "#forecast-" + num + "-img";
  var headingId = "#forecast-" + num + "-heading";
  var tempId = "#forecast-" + num + "-temp";
  var txtId = "#forecast-" + num + "-txt";

  $(imgId).html(createForecastImg(forecast.icon, forecast.shortForecast));
  $(headingId).html(forecast.periodName);
  $(tempId).html(createForecastTemp(forecast.temperature, forecast.temperatureUnit, forecast.isDaytime));
  $(txtId).html(forecast.detailedForecast);
}

function createForecastTemp(temperature, units, isDaytime) {
  if (isDaytime) {
    return "<strong>High: " + getTemperature(temperature, units) + "</strong>";
  } else {
    return "<strong>Low: " + getTemperature(temperature, units) + "</strong>";
  }
}

function createCurrentHtml(stationInfo, observation) {
  var html = "<h4>" + observation.message + "</h4>\n"
  html += "<strong>Temperature:</strong> " + getTemperature(observation.temperature, observation.tempUnitCode) + "<br>";
  html += "<strong>Humidity:</strong> " + getHumidity(observation.humidity) + "<br>";
  html += "<strong>Station:</strong> " + stationInfo.id + " - " + stationInfo.name + "<br>";

  var obsDate = new Date(observation.timestamp);

  html += "<strong>Time:</strong> " + obsDate.toString() + "<br>";

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

function getHumidity(humidity) {
  if (humidity === null) {
    return "--";
  } else {
    return Math.round(humidity) + "%";
  }
}

function getTemperature(temperature, units) {
  if (temperature === null) {
    return "--";
  }

  if (useF) {
    return convertTemp(temperature, units) + "F";
  } else {
    return convertTemp(temperature, units) + "C";
  }
}

function convertTemp(temperature, units) {
  if (useF) {
    // should produce degrees F
    switch (units) {
      case "c":
      case "C":
      case "unit:degC":
        return degC2DegF(temperature);

      case "f":
      case "F":
      case "unit:degF":
        return Math.round(temperature);
    }
  } else {
    // should produce degrees C
    switch (units) {
      case "c":
      case "C":
      case "unit:degC":
        return Math.round(temperature);

      case "f":
      case "F":
      case "unit:degF":
        return degF2DegC(temperature);
    }
  }

  console.log("!!!WARN: falling through to no temp conversion for units " + units);
  return Math.round(temperature);
}

function degC2DegF(tempC) {
  return Math.round((tempC * (9.0 / 5.0)) + 32);
}

function degF2DegC(tempF) {
  return Math.round((tempF - 32) * (5.0 / 9.0));
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
  this.getPointForecast = function() { return pointForecast; };

  // private
  var havePoint = function() {
    stationObservation = new LWObservation(point);
    stationObservation.fetch(haveObservation);
  };

  var haveObservation = function() {
    pointForecast = new LWForecast(point);
    pointForecast.fetch(finalCallback);
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
      "timestamp": o.properties.timestamp,
      "message": o.properties.textDescription,
      "temperature": o.properties.temperature.value,
      "tempUnitCode": o.properties.temperature.unitCode,
      "humidity": o.properties.relativeHumidity.value,
      "windSpeed": o.properties.windSpeed.value
    };

    callback();
  };
};

var LWForecast = function(lwPoint) {
  var point = lwPoint;
  var forecasts = [];
  var callback;

  // public
  this.fetch = function(cb) {
    callback = cb;
    console.log("Starting point forecast fetch");

    var uri = "https://api.weather.gov/points/" + point.latitude() + "," + point.longitude() + "/forecast";
    $.getJSON(uri, onForecast);
  };

  this.getForecasts = function() { return forecasts; };

  // private
  var onForecast = function(forecast) {
    console.log(forecast);
    var rawForecasts = forecast.properties.periods;
    for (var i = 0; i < 3; i++) {
      forecasts.push({
        "periodName": rawForecasts[i].name,
        "icon": rawForecasts[i].icon,
        "shortForecast": rawForecasts[i].shortForecast,
        "detailedForecast": rawForecasts[i].detailedForecast,
        "temperature": rawForecasts[i].temperature,
        "temperatureUnit": rawForecasts[i].temperatureUnit,
        "isDaytime": rawForecasts[i].isDaytime
      });
    }

    callback();
  };
};
