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
var crawler_sockets = {}
var bot_sockets = {}
//var crawler_sockets = [];
//var bot_sockets = [];
var running_crawler_socket_id= -1;
var ids = new Map();
var init = false;
io.on("connection", (socket) => {
  console.log("websocket connected ID : ", socket.id,'Type : ',socket.handshake.headers.type);

  if(socket.handshake.headers.type == TYPE_CRAWLER){
    console.log("CRAWLER websocket connected ID : ", socket.id);
    //crawler_sockets.push(socket);
    crawler_sockets[socket.id] = socket;
    if(running_crawler_socket_id == -1){
      running_crawler_socket_id = socket.id;
      startCrawler();
    }
  }else if (socket.handshake.headers.type == TYPE_BOT){
    console.log("BOT websocket connected ID : ", socket.id);
    //bot_sockets.push(socket);
    bot_sockets[socket.id] = socket;
  }else if (socket.handshake.headers.type == TYPE_ASSIST){
    console.log("TYPE_ASSIST websocket connected ID : ");
  }

  socket.on("notice", (rsp) => {
    if(rsp.result == 'success'){
      var posts = rsp.data.data.posts;
      //console.log(posts.length);
      parsePosts(posts);
    }else{
      console.log('notice fail',socket.id);

      var next =false;
      if(running_crawler_socket_id == socket.id){
        running_crawler_socket_id = -1;
        next = true;
      }
      delete crawler_sockets[socket.id];

      if(next){
        startCrawler();
      }
      //deleteSocket(socket); // not disconnect , only remove in socket_list
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnect",socket.id);
    //deleteSocket(socket);
    
    if(socket.handshake.headers.type == TYPE_CRAWLER){
      var next =false;
      console.log('cralwer socket disconnect , id : ',socket.id);
      if(running_crawler_socket_id == socket.id){
        running_crawler_socket_id = -1;
        next = true;
      }
      delete crawler_sockets[socket.id];

      if(next){
        startCrawler();
      }

      
    }else if (socket.handshake.headers.type == TYPE_BOT){
      delete bot_sockets[socket.id];
      console.log('bot socket disconnect , count ',Object.keys(bot_sockets).length);
    }else if (socket.handshake.headers.type == TYPE_BOT){
      console.log('assist socket disconnect');
    }

  });
});

//var test_flag = true;
function parsePosts(posts){
  //console.log('bot socket lenght', bot_sockets.length);
  for (var i = 0; i < posts.length; i++) {
    var notice_id = posts[i].id;
    var notice_title = posts[i].text;

    if(init){
        if (notice_id != undefined && notice_title != undefined) {
            
            // if(notice_id==1092){
            //     notice_id= 1111
            // }
            
            var latest_title = ids.get(notice_id);
            if (latest_title == undefined) { // 신규프로젝트 공시 등장
                console.log('프로젝트감지 ',posts[i]);

                Object.keys(bot_sockets).forEach(function(socket_id){
                  io.to(socket_id).emit('new_post',posts[i])
                })

                ids.set(notice_id, notice_title);
                //fcm.sendUpbitProjectExchangeFCM(posts[i],notice_title);
            }
        }

    }else{
        // 초기화
        // if(test_flag){
        //   setInterval(function(){
        //     Object.keys(bot_sockets).forEach(function(socket_id){
        //       io.to(socket_id).emit('new_post',posts[0])
        //     })
            
        //     fcm.sendUpbitProjectExchangeFCM(posts[0],notice_title);
        //   },30000)
        //   test_flag = false;
        // }
        

        if (notice_id != undefined && notice_title != undefined) {
            ids.set(notice_id, notice_title);
        }
    }
  }

  if(posts.length>0){
    init = true;
    //bot_sockets.map((socket)=>  io.to(socket.id).emit('posts',posts));
  }
  //console.log(ids.size);

}


// function deleteSocket(socket) {

//   var position = crawler_sockets.indexOf(socket);
//   crawler_sockets.splice(position, 1);

//   //position = bot_sockets.indexOf(socket);
//   //bot_sockets.splice(position, 1);

//   if(running_crawler_socket == socket){
//      startCrawler();
//   }
// }

 function startCrawler(){
 
    if(running_crawler_socket_id == -1){
      if(Object.keys(crawler_sockets).length > 0){
        var first_crawler_socket_id = Object.keys(crawler_sockets)[0];
        running_crawler_socket_id = first_crawler_socket_id;
        console.log("cralwer_sockets : ",Object.keys(crawler_sockets).length,running_crawler_socket_id,Object.keys(crawler_sockets));
        io.to(first_crawler_socket_id).emit("start_crawler", { interval : 350 });
      }
    }else{
      io.to(socket_id).emit("start_crawler", { interval : 350 });
    }

  // if(crawler_sockets.length > 0){
  //   running_crawler_socket = crawler_sockets[0];
  //   io.to(running_crawler_socket.id).emit("start_crawler", { interval : 350 });
  // }else{
  //   running_crawler_socket = undefined;
  //   console.log('crawler socket legnth 0');
  // }
  
}

