var admin = require('firebase-admin');
var serviceAccount = require('./bippump-firebase-adminsdk-k81kt-69b8172f1a.json');
var users = new Map();
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://bippump.firebaseio.com/"
});

var db = admin.database();
var user_ref = db.ref("users");
user_ref.on("child_changed", function (snapshot) {
    var device_id = snapshot.key;
    users.set(device_id,snapshot.val());
    //console.log('child_changed',users);
    module.exports.users= users;
});

user_ref.on("child_added", function (snapshot, prevChildKey) {
    var device_id = snapshot.key;

    // if(device_id == '52cc0853afac8125'){
    //     console.log(snapshot.val());
    // }
    users.set(device_id,snapshot.val());
    //console.log('child_added',users);
    module.exports.users= users;
});
