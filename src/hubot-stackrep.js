// Description:
//   StackOverflow reputation notifier
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   hubot getrep  - returns the SO reputation for fguchelaar
//   hubot getrep [id] - returns the SO reputation for user with id
var CronJob = require('cron').CronJob;
var https = require('https');
var zlib = require('zlib');

module.exports = function (robot) {
  // new CronJob('* * * * * *',
  //     function() {
  //
  //         var room = '#slackrep';
  //
  //         robot.logger.info('Awesomation FTW!');
  //         robot.messageRoom(room, 'I will nag you every second');
  //     },
  //     null,
  //     true,
  //     'America/Los_Angeles');

  // room = '#random'
  //
  // workdaysNineAm = ->
  //     robot.emit 'slave:comand', 'wake everyone up', room
  //
  // everyFiveMinutes = ->
  //     robot.logger.debug 'I will nag you every minute'
  // robot.messageRoom room, 'I will nag you every minute'
  //
  robot.respond(/getrep.?(\d*)?/i, function (msg) {
    var soId = msg.match[1];
    robot.logger.info('getting reputation');

    if (soId === undefined) {
      soId = '964961';
    }

    msg.send('Getting reputation for ' + soId);

    var options = {
      host: 'api.stackexchange.com',
      path: '/2.2/users/' + soId + '/reputation-history?site=stackoverflow'
    };

    https.get(options, function (res) {
      var gunzip = zlib.createGunzip();
      var output = '';
      res.pipe(gunzip);
      gunzip.on('data', function (data) {
        output += data;
      });
      gunzip.on('end', function () {
        var json = JSON.parse(output);
        var i;
        var change;

        for (i = 5; i >= 0; i--) {
          change = json.items[i].reputation_change;

          switch (json.items[i].reputation_history_type) {
            case 'post_upvoted':
              msg.send('A post was upvoted and you have gained ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id);
              break;
            case 'answer_accepted':
              msg.send('An answer was accepted and you have gained ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id);
              break;
            case 'post_unupvoted':
              msg.send('An upvote was undone and you have lost ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id);
              break;
            case 'post_undownvoted':
              msg.send('Yikes, a post was downvoted and you have lost ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id);
              break;
            case 'post_downvoted':
              msg.send('Pfew, a downvote was undone and you have gained ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id);
              break;
            default:
              msg.send('you have gained ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id);
          }
        }

        msg.send('Latest change: ' + robot.brain.get('964961_latest_reputation_change_date'));
        robot.brain.set('964961_latest_reputation_change_date', json.items[0].creation_date);
      });
    });
  });
};
