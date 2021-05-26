//var fcm = require('./fcm.js');
var express = require('express');
var app = express();
var CronJob = require('cron').CronJob;
var cors = require("cors");
app.use(cors());
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var Twitter = require('twitter');
var axios = require('axios').default;
var moment = require('moment');
require('moment-timezone');
var dateFormat = require('dateformat');
moment.tz.setDefault("Asia/Seoul");

const port = process.env.PORT || 3000;
const TYPE_CRAWLER = 'crawler';
const TYPE_BOT = 'bot';
const TYPE_ASSIST = 'assist';

var client8 = new Twitter({
  consumer_key: '0mmd74y5u7DXjl1e0lXLTU5Q9',
  consumer_secret: '9IB1YpqF6gKljXIR4W6Ksc4EsGjOLKPgHv5izjt8aMZ05TIgJi',
  access_token_key: '1176677037857050624-WFgogXB1NLOJLxRIzsD5MXnXJ8YYo1',
  access_token_secret: 'dND0sODeo8m6F58nXwUG53tA3ErG4XP8siOCDIgxEcCqa'
});


var client9 = new Twitter({
  consumer_key: 'oTPw6s5LEBrD2zr4AFdZRRT68',
  consumer_secret: 'rlVwrn1NdMtBmW6VYGckakSLKFFfsOWJNv3NUZyc5X86hFABnU',
  access_token_key: '1176677037857050624-kLASUsDS6L224yeJGJdrc4UL4phGqk',
  access_token_secret: 'JZB9syD0TT16nkZ9ua7yqQcwVC9nA0ljkbk47Qns5yOVu'
});


var client10 = new Twitter({
  consumer_key: 'XCp1xFni7u7yIs7cHISLJgxnV',
  consumer_secret: 'pF18C0bIrsneSfybx7BGDKboiAxauKSQoCnMiudDlZoDmmtqeg',
  access_token_key: '1176677037857050624-RkTyzjfTbegfIfRNbYvYFD86B6dd5Y',
  access_token_secret: 'P5mjbL48W4RQzuXNvGhB2bDTC22koX8ePzdKetcVY9E0U'
});

server.listen(port, async function () {
  console.log(`application is listening on port@ ${port}...`);
});

var bot_sockets = {}
var ids = new Map();
var titles = new Map();
var init = false;

//startElonmuskTwitterCrawler();
upbitNoticeCrawler();

io.on("connection", (socket) => {
  console.log("websocket connected ID : ", socket.id, 'Type : ', socket.handshake.headers.type);

  if (socket.handshake.headers.type == TYPE_CRAWLER) {
    console.log("CRAWLER websocket connected ID : ", socket.id);
  } else if (socket.handshake.headers.type == TYPE_BOT) {
    console.log("BOT websocket connected ID : ", socket.id);
    bot_sockets[socket.id] = socket;
  } else if (socket.handshake.headers.type == TYPE_ASSIST) {
    console.log("TYPE_ASSIST websocket connected ID : ");
  }

  socket.on("notice", (rsp) => {
    if (rsp.result == 'success') {
      var posts = rsp.data.data.posts;
      console.log(posts.length, ids.size);
      parsePosts(posts);
    }
  });

  socket.on("disconnect", () => {
    if (socket.handshake.headers.type == TYPE_CRAWLER) {
      console.log('cralwer socket disconnect , id : ', socket.id);
    } else if (socket.handshake.headers.type == TYPE_BOT) {
      delete bot_sockets[socket.id];
      console.log('bot socket disconnect , count ', Object.keys(bot_sockets).length);
    }
  });
});

function startElonmuskTwitterCrawler() {
  console.log('startElonmuskTwitterCrawler');
  var i = 0;
  setInterval(function () {
    switch (i) {
      case 0:
        elonmusk(client8);
        break;
      case 1:
        elonmusk(client9);
        break;
      case 2:
        elonmusk(client10);
        break;
    }

    i++;
    if (i >= 3) {
      i = 0;
    }
  }, 1000);
}

async function getPattern(){
  const response = await axios.get('https://api.upbit.com/v1/market/all');
  var krw_symbols = [];
  response.data.forEach(market =>{
    var market_name = market.market.split("-")[0]; //KRW , BTC
    var symbol = market.market.split("-")[1]; // ADA, XRP
    if(market_name=="KRW"){
      krw_symbols.push('\\b'+symbol+'\\b');
    }
  });
  return krw_symbols.join('|');
}

function getSymbols(notice_title,reg){
  var symobls = [];
  while ( matches = reg.exec(notice_title)) {
    symobls.push(matches[0]); // 심볼추가
  }
  return symobls;
}
var reg;
var latest_notice_id = undefined;
async function upbitNoticeCrawler() {

  var pattern = await getPattern();

  if(pattern){
    reg = new RegExp(pattern, 'g');

    setInterval(function () {
      axios({
        method: 'get',
        url: "https://api-manager.upbit.com/api/v1/notices?page=1&per_page=1",
        timeout: 30000
      }).then(function (response) {
        //console.log(response.data.data.list);
        var notice = response.data.data.list[0];
        if(notice){
          
          if(latest_notice_id == undefined){
            latest_notice_id = notice.id;
           
          }else{
            //console.log(notice.title);
            //notice.title = '[안내] ARK 입출금 일시 중단 안내 BTT';

            if(latest_notice_id < notice.id && checkToday(notice.created_at)){
              latest_notice_id = notice.id;

              var new_notice = {
                title : notice.title,
                id : notice.id,
                view_count : notice.view_count,
                krw_symbols : getSymbols(notice.title,reg)
              } 
              
              Object.keys(bot_sockets).forEach(function (socket_id) {
                io.to(socket_id).emit('new_notice', new_notice)
              })
            }
          }
        }
      }).catch(function (error) {
        console.log('error@',error);
      })
    }, 3000);
  }

}


function parsePosts(posts) {

  if (posts.length != 20) {
    console.log('post length not 20!!!');
    return
  }

  if (init) {
    for (var i = 0; i < 5; i++) {
      var notice_id = posts[i].id;
      var notice_title = posts[i].text;
      if (notice_id != undefined && notice_title != undefined) {
        // if(notice_id==582){
        //     notice_id= 1
        //     notice_title= "test"
        //     posts[i].start_date = "2021-03-19T00:00:00+09:00";
        // }

        var check_title_from_id = ids.get(notice_id); // 새로운 공지 아이디 인지 체크
        var check_title_from_title = titles.get(notice_title) // 새로운 공지 제목인지 체크
        if (check_title_from_id == undefined && check_title_from_title == undefined) { // 신규프로젝트 공시 등장
          var today = checkToday(posts[i].start_date.split("T")[0]) // 알림 발생 시간이 오늘인지 검사
          if (today) { // 오늘자 공시 만 알림 발생
            console.log('프로젝트감지 ', posts[i]);
            posts[i].text = "(" + posts[i].assets + ")" + posts[i].text; // 타이틀 앞에 심볼 값 추가
            Object.keys(bot_sockets).forEach(function (socket_id) {
              io.to(socket_id).emit('new_post', posts[i])
            })
            //fcm.sendUpbitProjectExchangeFCM(posts[i], posts[i].text);
          } else {
            console.log('!!!! new post is not today notice !!!!!', posts[i]);
          }
        }
        titles.set(notice_title, notice_id);
        ids.set(notice_id, notice_title);
      }
    }
  } else {
    for (var i = 0; i < posts.length; i++) {
      var notice_id = posts[i].id;
      var notice_title = posts[i].text;
      if (notice_id != undefined && notice_title != undefined) {
        titles.set(notice_title, notice_id);
        ids.set(notice_id, notice_title);
      }
    }

    //console.log(titles);
    init = true;
  }
  //console.log(ids.size);

}



function checkToday(start_date) {
  //console.log(moment());
  return moment(start_date).isSame(moment(), 'day');

}

var tweet_id = '';
function elonmusk(client) {

  var params = {
    screen_name: 'elonmusk',
    count: 1,
    tweet_mode: "extended",
    include_rts: true,
    exclude_replies: false
  };

  client.get('statuses/user_timeline', params, function (error, tweets, response) {
    if (!error) {
      if (tweets.length > 0) {
        // tweets.forEach(tweet => {
        //   console.log(tweet.full_text, '>>', tweet.in_reply_to_status_id, '::', tweet.id_str,"##",tweet_type,"XX",fcm_data.link);
        // });

        var tweet = tweets[0];
        // init
        if (tweet_id == '') {
          tweet_id = tweet.id;
        } else {
          if (tweet_id < tweet.id) {
            tweet_id = tweet.id;

            var tweet_type = undefined;
            if (tweet.in_reply_to_status_id) {
              tweet_type = "REPLY";
            } else {
              if (tweet.full_text.indexOf("RT ") > -1) {
                tweet_type = "RETWEET";
              } else {
                tweet_type = "MAIN";
              }
            }

            var tweet_data = {
              id: tweet.id,
              text: tweet.full_text,
              created_at: tweet.created_at,
              retweet_count: tweet.retweet_count,
              favorite_count: tweet.favorite_count,
              user: {
                name: tweet.user.name,
                screen_name: tweet.user.screen_name,
                profile_image_url: tweet.user.profile_image_url
              },
              entities: tweet.entities,
              timestamp: now(),
              tweet_type: tweet_type,
              link: 'https://twitter.com/elonmusk/status/' + tweet.id_str
            }

            var fcm_data = {
              type: 'elonmusk',
              subType: 'elonmusk',
              timestamp: now2(),
              tweet: tweet_data
            }
            console.log('send@@', fcm_data);

            Object.keys(bot_sockets).forEach(function (socket_id) {
              io.to(socket_id).emit('new_twitter', tweet_data)
            })
            //fcm.sendProNoticeFcm(fcm_data);
          }
          //console.log("Tweet@", id, text, created_at);
        }
      } else {
        console.log("tweets.length is 0 ");
      }
    } else {
      console.log("tweet error : " + error);
    }
  });
}

function now() {
  return dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
}


function now2() {
  return moment().format('YYYY-MM-DD HH:mm:ss');
}