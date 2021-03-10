
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
     startCrawler();
  }
}

 function startCrawler(){

  if(crawler_sockets.length > 0){
    running_crawler_socket = crawler_sockets[0];
    io.to(running_crawler_socket.id).emit("start_crawler", { interval : 150 });
  }else{
    running_crawler_socket = undefined;
    console.log('crawler socket legnth 0');
  }
  
}

