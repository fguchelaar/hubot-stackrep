// Description:
//   StackOverflow reputation notifier
//
// Dependencies:
//   cron
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
  robot.brain.set('hubot-stackrep-data', {
    '964961' : {
      soId: '964961',
      soName: 'fguchelaar',
      lastChangeDate: 1458171985
    },
    '1973271' : {
      soId: '1973271',
      soName: 'flup',
      lastChangeDate: 1458171985
    }
  });

  new CronJob('0 */5 * * * *',
    function () {
      var room = '#slackrep';
      var stackrepData = robot.brain.get('hubot-stackrep-data');
      var key;
      robot.logger.info(stackrepData);

      for (key in stackrepData) {
        robot.logger.info(key);
        getReputation(stackrepData[key], null, room);
      }
    },
    null,
    true,
    'America/Los_Angeles');

  function getReputation(userData, msg, room) {
    var options = {
      host: 'api.stackexchange.com',
      path: '/2.2/users/' + userData.soId + '/reputation-history?site=stackoverflow'
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
        var message;
        var stackrepData = robot.brain.get('hubot-stackrep-data');

        for (i = json.items.length - 1; i >= 0; i--) {
          if (json.items[i].creation_date <= userData.lastChangeDate) {
            continue;
          }

          change = json.items[i].reputation_change;

          switch (json.items[i].reputation_history_type) {
            case 'post_upvoted':
              message = 'A post was upvoted and ' + userData.soName + ' has gained ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id;
              break;
            case 'answer_accepted':
              message = 'An answer was accepted and ' + userData.soName + ' has gained ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id;
              break;
            case 'post_unupvoted':
              message = 'An upvote was undone and ' + userData.soName + ' has lost ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id;
              break;
            case 'post_undownvoted':
              message = 'Yikes, a post was downvoted and ' + userData.soName + ' has lost ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id;
              break;
            case 'post_downvoted':
              message = 'Pfew, a downvote was undone and ' + userData.soName + ' has gained ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id;
              break;
            default:
              message = '' + userData.soName + ' has gained ' + change + ' reputation. http://www.stackoverflow.com/questions/' + json.items[i].post_id;
          }
          if (msg) {
            msg.send(message);
          }
          if (room) {
            robot.messageRoom(room, message);
          }
        }

        stackrepData[userData.soId].lastChangeDate = json.items[0].creation_date;
        robot.brain.set('hubot-stackrep-data', stackrepData);
      });
    });
  }

  robot.respond(/getrep.?(\d*)?/i, function (msg) {
    var stackrepData = robot.brain.get('hubot-stackrep-data');
    var soId = msg.match[1];
    var userData;

    robot.logger.info('getting reputation');

    if (soId === undefined) {
      soId = '964961';
    }

    // find the data
    userData = stackrepData[soId];
    robot.logger.info(userData);
    if (userData === undefined) {
      robot.logger.info('No userdata found for ' + soId);
    } else {
      getReputation(userData, msg);
    }
  });
};
