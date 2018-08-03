
var request = require('request');
var cheerio = require('cheerio');
var schedule = require('node-schedule');

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//var world_status = [];
var congested = true;
var full_world_list = [];
var preferred_world_list = [];
var new_world_list = [];
var standard_world_list = [];
var congested_world_list = [];

var pageToVisit = "https://na.finalfantasyxiv.com/lodestone/news/detail/80cd4583bf743600105b947d6906d0909189e479";
//var world_name = 'Bahamut';

requestServerStatus(); //run initial

var j = schedule.scheduleJob('* * * * *', function () {
    console.log("Visiting page " + pageToVisit);
    requestServerStatus();
});

function requestServerStatus() {
    var temp_full_world_list = [];
    request(pageToVisit, function (error, response, body) {
        if (error) {
            console.log("Error: " + error);
        }
        // Check status code (200 is HTTP OK)
        console.log("Status code: " + response.statusCode);
        if (response.statusCode === 200) {
            // Parse the document body
            var $ = cheerio.load(body);
            /*             console.log("Page title:  " + $('title').text());
                        console.log($('.news__detail__wrapper').text()); */
            var news_detail = $('.news__detail__wrapper').text();
            console.log(news_detail);
            //var world_name_index = news_detail.indexOf(world_name);
            var preferred_world_indexes = getAllIndexes(news_detail, '▼Preferred Worlds');
            var new_world_indexes = getAllIndexes(news_detail, '▼New Worlds');
            var standard_world_indexes = getAllIndexes(news_detail, '▼Standard Worlds');
            var congested_world_indexes = getAllIndexes(news_detail, '▼Congested Worlds');
            console.log('\n-----------------------------\n');
            console.log('123');
            preferred_world_list = populateWorldList(news_detail, preferred_world_indexes);
            new_world_list = populateWorldList(news_detail, new_world_indexes);
            standard_world_list = populateWorldList(news_detail, standard_world_indexes);
            congested_world_list = populateWorldList(news_detail, congested_world_indexes);
            temp_full_world_list = temp_full_world_list.concat(preferred_world_list);
            temp_full_world_list = temp_full_world_list.concat(new_world_list);
            temp_full_world_list = temp_full_world_list.concat(standard_world_list);
            temp_full_world_list = temp_full_world_list.concat(congested_world_list);
            temp_full_world_list.sort(function (a, b) {
                if (a < b) return -1;
                if (a > b) return 1;
                return 0;
            })
            full_world_list = temp_full_world_list;
        }
    });
};

function getWorldStatus(news_detail, index) {
    var world = {};
    var nameArray = [];
    var congested = (news_detail.charCodeAt(index - 2) == 215) ? true : false;
    while (news_detail.charCodeAt(index) != 10) {
        nameArray.push(news_detail[index]);
        index++;
    }
    world.name = nameArray.join('');
    world.congested = congested;
    return world;
}

function populateWorldList(news_detail, indexes) {
    var world_list = [];
    for (i of indexes) {
        i++; //skip first ▼
        while (news_detail[i] != '▼' && i < news_detail.length) {
            if (news_detail[i] == '○' || news_detail[i] == '×') {
                i = i + 2;
                var nameArray = [];
                while (news_detail.charCodeAt(i) != 10) {
                    nameArray.push(news_detail[i]);
                    i++;
                }
                var world_name = nameArray.join('');
                world_list.push(world_name);
            }
            i++;
        }
    }
    console.log(world_list);
    return world_list;
}

/* function getAllIndexes(arr, val) {
    var indexes = [],
        i;
    for (i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
} */

function getAllIndexes(arr, val) {
    var indexes = [],
        i = -1;
    while ((i = arr.indexOf(val, i + 1)) != -1) {
        indexes.push(i);
    }
    return indexes;
}


io.on('connection', function (socket) {
    if (full_world_list !== []) {
        socket.emit('world_list', full_world_list);
        //socket.emit('server_congested', i.name, i.congested);
        socket.on('server_selection', function (selection) {
            if (congested_world_list.indexOf(selection) > -1) {
                socket.emit('server_congested', selection, true);
            } else if (preferred_world_list.indexOf(selection) > -1) {
                socket.emit('server_congested', selection, false);
            } else if (new_world_list.indexOf(selection) > -1) {
                socket.emit('server_congested', selection, false);
            } else if (standard_world_list.indexOf(selection) > -1) {
                socket.emit('server_congested', selection, false);
            } else {
                socket.emit('server_congested', selection, false);
            };
        })
    }
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function () {
    console.log('Listening on *:3000');
});