var fcm = require('./fcm.js');
var express = require('express');
var app = express();
var cors = require("cors");
app.use(cors());
var server = require("http").createServer(app);
var io = require("socket.io")(server);
const port = process.env.PORT || 3000;
const TYPE_CRAWLER = 'crawler'; 
const TYPE_BOT = 'bot';
const TYPE_ASSIST = 'assist';

server.listen(port, async function () {
  console.log(`application is listening on port@ ${port}...`);
});
var bot_sockets = {}
var ids = new Map();
var init = false;
io.on("connection", (socket) => {
  console.log("websocket connected ID : ", socket.id,'Type : ',socket.handshake.headers.type);

  if(socket.handshake.headers.type == TYPE_CRAWLER){
    console.log("CRAWLER websocket connected ID : ", socket.id);
  }else if (socket.handshake.headers.type == TYPE_BOT){
    console.log("BOT websocket connected ID : ", socket.id);
    bot_sockets[socket.id] = socket;
  }else if (socket.handshake.headers.type == TYPE_ASSIST){
    console.log("TYPE_ASSIST websocket connected ID : ");
  }
  
  socket.on("start_crawler", (rsp) => {
    recent_start_cralwer = socket.id;
  })

  socket.on("notice", (rsp) => {
    if(rsp.result == 'success'){
      var posts = rsp.data.data.posts;
      console.log(posts.length,ids.size);
      parsePosts(posts);
    }
  });

  socket.on("disconnect", () => {
    if(socket.handshake.headers.type == TYPE_CRAWLER){
      console.log('cralwer socket disconnect , id : ',socket.id);
    }else if (socket.handshake.headers.type == TYPE_BOT){
      delete bot_sockets[socket.id];
      console.log('bot socket disconnect , count ',Object.keys(bot_sockets).length);
    }else if (socket.handshake.headers.type == TYPE_BOT){
      console.log('assist socket disconnect');
    }

  });
});

function parsePosts(posts){

  if(posts.length != 20){
    console.log('post length not 20!!!');
    return
  }

  if(init){
    for (var i = 0; i < 5; i++) {
      var notice_id = posts[i].id;
      posts[i].text = "("+posts[i].assets+")"+posts[i].text; // 타이틀 앞에 심볼 값 추가
      var notice_title = posts[i].text;
      if (notice_id != undefined && notice_title != undefined) {
              
        // if(notice_id==1112){
        //     notice_id= 1
        // }
        
        var latest_title = ids.get(notice_id);
        if (latest_title == undefined) { // 신규프로젝트 공시 등장
            console.log('프로젝트감지 ',posts[i]);
            Object.keys(bot_sockets).forEach(function(socket_id){
              io.to(socket_id).emit('new_post',posts[i])
            })

            ids.set(notice_id, notice_title);
            fcm.sendUpbitProjectExchangeFCM(posts[i],notice_title);
        }
      }
    }
  }else{
    for (var i = 0; i < posts.length; i++) {
      var notice_id = posts[i].id;
      posts[i].text = "("+posts[i].assets+")"+posts[i].text; // 타이틀 앞에 심볼 값 추가
      var notice_title = posts[i].text;
  
      if (notice_id != undefined && notice_title != undefined) {
        ids.set(notice_id, notice_title);
      }
    }
    init = true;
  }

  //console.log(ids.size);

}