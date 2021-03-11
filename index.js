
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
var ids = new Map();
var init = false;
io.on("connection", (socket) => {
  console.log("websocket connected ID : ", socket.id,'Type : ',socket.handshake.headers.type);

  if(socket.handshake.headers.type == TYPE_CRAWLER){
    console.log("CRAWLER websocket connected ID : ", socket.id,'Type : ',socket.handshake.headers.type);
    crawler_sockets.push(socket);
  }else{
    console.log("BOT websocket connected ID : ", socket.id,'Type : ',socket.handshake.headers.type);
    bot_sockets.push(socket);
  }

  if(running_crawler_socket == undefined){
    startCrawler(socket);
  }

  socket.on("notice", (rsp) => {
    if(rsp.result == 'success'){
      var posts = rsp.data.data.posts;
      parsePosts(posts);
    }else{
      console.log('fail');
      //deleteSocket(socket); // not disconnect , only remove in socket_list
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnect",socket.id);
    deleteSocket(socket);
  });
});

function parsePosts(posts){
  for (var i = 0; i < posts.length; i++) {
    var notice_id = posts[i].id;
    var notice_title = posts[i].text;

    if(init){
        if (notice_id != undefined && notice_title != undefined) {
            
            // if(notice_id==1080){ // 최근 무비
            //     notice_id= 1111
            // }

            var latest_title = ids.get(notice_id);
            if (latest_title == undefined) { // 신규프로젝트 공시 등장
                //callback(posts[i]);
                bot_sockets.map((socket)=>  io.to(socket.id).emit('new_post',posts[i]));
                ids.set(notice_id, notice_title);
            }
        }

    }else{
        // 초기화
        if (notice_id != undefined && notice_title != undefined) {
            ids.set(notice_id, notice_title);
        }
    }
  }

  if(posts.length>0){
    init = true;
  }

  console.log(ids.size);

}

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
    io.to(running_crawler_socket.id).emit("start_crawler", { interval : 350 });
  }else{
    running_crawler_socket = undefined;
    console.log('crawler socket legnth 0');
  }
  
}

