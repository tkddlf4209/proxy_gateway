var FCM = require('fcm-node');
var fcm = new FCM("AAAAWcrMGUA:APA91bE8ySCz9l_V40msYnqZ-KeV7OOqpH8SWmSCktyYRVq5BKODZFZJNk0xGZk6XWhhYwj3r3JUh60XGx0pZV51YC6dvi4qIjV77ECCQ2LwxDsMj6SK6xCwnapa3NS4ybBT86gBNnbG");
var firebase = require('./firebase.js');
var moment = require('moment');
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

function sendTokensFcm(topic,fcm_data) { // 500개의 토큰 

  var fcm_count = 0;
  var acc_fcm_count = 0;
  var i = 0;
  var tokens = [];
  var user_length = firebase.users.size;

  firebase.users.forEach((value) => {
    //console.log(value);
    switch (topic) {
      case "exchange":
        if (value["exchange"] && value["exchange"]=='true') {
          tokens.push(value["token"]);
          fcm_count++;
          acc_fcm_count++;
        }
        break;
      case "twitter":
        if (value["twitter"] && value["twitter"]=='true') {
          tokens.push(value["token"]);
          fcm_count++;
          acc_fcm_count++;
        }
        break;
      case "proNotice":
        if (value["proNotice"] && value["proNotice"]=='true' ) {
          tokens.push(value["token"]);
          fcm_count++;
          acc_fcm_count++;
        }
        break;
    }

    i++;
   
    if(fcm_count == 500 || user_length == i){
      fcm_data.registration_ids = tokens;
      //console.log('ttttttttttttttt',fcm_data);
      fcm.send(fcm_data, function (err, rsp) {
        if (err) {
          //console.error('Push Fail >> TOPIC : ', topic,' ERR :',err);
        }
      });
      tokens =[];
      fcm_count=0;
    }
  });

  //if (topic != "proNotice") {
    console.log(now(), 'Push Send >> TOPIC ',topic, ' :: USER_COUNT ',user_length, ' ::  ACC_FCM_COUNT ',acc_fcm_count ,' ::  DATA ', fcm_data.data);
  //}

  return tokens;
}

exports.sendUpbitProjectExchangeFCM = function(notice){

  var fcm_data = {
    //collapse_key: topic, 없어도 될듯
    data: {
      topic:"exchange",
      exchange:topics.UPBIT,
      title: "업비트 프로젝트 공시 알림 테스트",
      body: notice.title,
      notice: notice,
      type:2
    },
    priority: "high",
    delay_while_idle:false,
    time_to_live: 0
  };
  testFCM(fcm_data);
  //sendTokensFcm('exchange',fcm_data)
}

function testFCM(fcm_data){
  var tokens = [
    'fofieevo59I:APA91bGZQ41_iencshmIOTw-bdvgqBLFU9uxjxr0xmh_pLiBYejMH0vDUCuJWyBOEe99M7oiWDGezVw01QaFDSDFNua-ceWPZQ_7t6j9ZVW21d2viunIfKNFY1vFPcbyHsy-mlKE0Uuz',
    'cMIozIfgvtg:APA91bEVto4S6Los6JmWhP-H7H8860DaE-cKVlTPMXGYc2pCMsPB1PbTOr-1acX0qWRb-2oZGogb5Zjct94eh1R54QiEiyAwzWiOU2Q3Co19p9ob9gTlRKn1vQ9rl0JuZPrzJLEQivxS'
  ]
  fcm_data.registration_ids = tokens;
  fcm.send(fcm_data, function (err, rsp) {
    if (err) {
      //console.error('Push Fail >> TOPIC : ', topic,' ERR :',err);
    }
  });
}

function now() {
  return moment().format('YYYY-MM-DD HH:mm:ss');
  //return dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
}


