var timeOutId = 0;
function ajaxFunction() {
  $.ajax({
    url: '../private/records.json?_=' + +(new Date),
    success: function(data, textStatus, jqXHR) {
      setupTables(data);
      timeOutId = setTimeout(ajaxFunction, 2000);
    }
  });
}
ajaxFunction();
var rank = [];
var tables;

function addToRankList(name, time) {
  rank.push({name: name, time: time, game; game});
}

function getRank(data) {
  var rankLocInArray = find_in_array(rank, 'time', data.time);
  if(!rank[rankLocInArray]) {
    addToRankList(data.name, data.time, data.game);
  }
  rank.sort(compare);
  var newRank = find_in_array(rank, 'time', data.time);
  return newRank + 1;
}

function setTables(data) {
  var tablesByGame = {};
  data.forEach(function (obj) { 
    if (tablesByGame[obj.game]) { 
      tablesByGame[obj.game].push(obj); 
    } else { 
      tablesByGame[obj.game] = [obj]; 
    } 
  });
  tables = tablesByGame;
}

function compare(a,b) {
  if (a.time < b.time)
    return -1;
  if (a.time > b.time)
    return 1;
  return 0;
}

var parent = $('.container');

function setupTables(data) {
  setTables(data);
  for (var table in tables) {
   setupTable(data, table);
 }
}

function setupTable(data, table) {
 var tableLoc = find_in_array(data, 'game', table);
 if($("#" + table).length == 0) {
   drawTable(table);
 } else {
  $("#" + table).find("tr:gt(0)").empty();
}
data.forEach(function(e, i, a) {
  var playerLoc = find_in_array(data, 'game', e.game);
  if(e.game == table) {
   drawRow(table, e);
 }
});
}


function drawTable(tableData) {
  var $table = $("<table id=" + tableData + "> </table>");
  parent.append($table);
  $table.addClass('table table-condensed table-striped');
  $table.before("<p class='text-center'>" + $table.attr("id").toString() + "</p>");
  $table.html("<tr id='#'" + tableData + "> <th>Rank</th><th>Name</th><th>Time</th></tr>");
  $table.append("<br> <br>");
}

function drawRow(game, table) {
  var row = $("<tr />");
  $("#" + game).append(row);
  row.append($("<td>" + getRank(table).toString() + "</td>"));
  row.append($("<td>" + table.name + "</td>"));
  row.append($("<td>" + msToTime(table.time) + "</td>"));
}

function msToTime(s) {

  function addZ(n) {
    return (n<10? '0':'') + n;
  }

  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;

  return addZ(hrs) + ':' + addZ(mins) + ':' + addZ(secs) + '.' + ms;
}

function find_in_array(arr, name, value) {
  for (var i = 0, len = arr.length; i<len; i++) {
    if (name in arr[i] && arr[i][name] == value) return i;
  };
  return false;
}