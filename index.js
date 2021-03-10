

/var request = require("request");
var express = require('express');
var app = express();
var cors = require("cors");
app.use(cors());
var server = require("http").createServer(app);
var io = require("socket.io")(server);
const port = process.env.PORT || 3000;
const TYPE_CRAWLER = 'crawler'; 
const TYPE_BOT = 'bot';

server.listen(port, async function () {
  console.log(`application is listening on port@ ${port}...`);
});

var crawler_sockets = [];
var bot_sockets = [];
var running_crawler_socket = undefined;
io.on("connection", (socket) => {

  console.log("websocket connected ID : ", socket.id,'Type : ',socket.handshake.headers.type);

  if(socket.handshake.headers.type == TYPE_CRAWLER){
    crawler_sockets.push(socket);
  }else{
    bot_sockets.push(socket);
  }

  if(running_crawler_socket == undefined){
    startCrawler(socket);
  }

  socket.on("notice", (rsp) => {
    if(rsp.result == 'success'){
      console.log(rsp.data);
    }else{
      deleteSocket(socket);
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnect",socket.id);
    deleteSocket(socket);
  });
});

function deleteSocket(socket) {
  
  var position = crawler_sockets.indexOf(socket);
  crawler_sockets.splice(position, 1);

  position = bot_sockets.indexOf(socket);
  bot_sockets.splice(position, 1);


  if(running_crawler_socket == socket){
    await startCrawler();
    if(socket.handshake.headers.type == TYPE_CRAWLER){
      await restartCrawlerServer(socket)
    }
  }
}

async function startCrawler(){

  if(crawler_sockets.length > 0){
    running_crawler_socket = crawler_sockets[0];
    io.to(running_crawler_socket.id).emit("start_crawler", { interval : 500 });
  }else{
    running_crawler_socket = undefined;
    console.log('crawler socket legnth 0');
  }
  
}


const TOKEN = '17a48625-de4b-447c-ac52-1b2124b59878';
async function restartCrawlerServer(socket) {
  var appName = socket.handshake.headers.app_name;
  if(appName == undefined){
    console.log('appName undefined');
    return;
  }

  if(appName == 'APP_NAME_UNDEFINED'){
    console.log('appName APP_NAME_UNDEFINED not allowed');
    return;
  }
  request({
      url: 'https://api.heroku.com/apps/' + appName + '/dynos/',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.heroku+json; version=3',
        'Authorization': 'Bearer ' + TOKEN   
      }
    }, function (error, response, body) {
      if(error){
        console.log(error);
      }
  });

}




