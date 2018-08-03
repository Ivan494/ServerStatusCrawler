var request = require('request');
var cheerio = require('cheerio');
var schedule = require('node-schedule');

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var world_status = [];
var congested = true;

var pageToVisit = "https://na.finalfantasyxiv.com/lodestone/news/detail/80cd4583bf743600105b947d6906d0909189e479";
var world_name = 'Bahamut';

requestServerStatus(); //run initial

var j = schedule.scheduleJob('* * * * *', function () {
    console.log("Visiting page " + pageToVisit);
    requestServerStatus();
});

function requestServerStatus() {
    var temp_status = [];
    request(pageToVisit, function (error, response, body) {
        if (error) {
            console.log("Error: " + error);
        }
        // Check status code (200 is HTTP OK)
        console.log("Status code: " + response.statusCode);
        if (response.statusCode === 200) {
            // Parse the document body
            var $ = cheerio.load(body);
            console.log("Page title:  " + $('title').text());
            console.log($('.news__detail__wrapper').text());
            var news_detail = $('.news__detail__wrapper').text();
            var world_name_index = news_detail.indexOf(world_name);
            var x_world_index = getAllIndexes(news_detail, '×');
            var o_world_index = getAllIndexes(news_detail, '○');
            console.log('\n-----------------------------\n');
            /*             console.log(x_world_index);
                        console.log(o_world_index);
                        console.log(news_detail[1423]);
                        console.log(news_detail.charCodeAt(1423) == 10); */
            //console.log(x_world_index);
            x_world_name_index = x_world_index.map(x => x + 2);
            o_world_name_index = o_world_index.map(x => x + 2);
            //console.log(x_world_index);
            for (x of x_world_name_index) {
                temp_status.push(getWorldStatus(news_detail, x));
            };
            for (x of o_world_name_index) {
                temp_status.push(getWorldStatus(news_detail, x));
            };
            world_status = temp_status;
            /*             console.log(world_status);
                        if (news_detail[world_name_index - 2] == '×') {
                            console.log(world_name + ' is congested, fml');
                            congested = true;
                            io.emit('server_congested', world_name, congested);
                        } else {
                            console.log(world_name + ' 9 rush');
                            congested = false;
                            io.emit('server_congested', world_name, congested);
                        } */
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

function getAllIndexes(arr, val) {
    var indexes = [],
        i;
    for (i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}

io.on('connection', function (socket) {
    if (world_status !== []) {
        /*     socket.serverSelection = 'Bahamut'; // default bahamut on server unused really
            var i = world_status.find(x => x.name === socket.serverSelection); */
        socket.emit('world_status', world_status);
        //socket.emit('server_congested', i.name, i.congested);
        socket.on('server_selection', function (selection) {
            var i = world_status.find(x => x.name === selection);
            socket.emit('server_congested', i.name, i.congested);
        })
    }
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function () {
    console.log('Listening on *:3000');
})