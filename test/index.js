var _, assert, chai, expect, fs, parsedError, path, rawError, sinon, sinonChai, slackOptions, testLevels, testTypes, winston, winstonSlack, winstonSlackClass;

_ = require('lodash');

fs = require('fs');

chai = require('chai');

path = require('path');

sinon = require('sinon');

sinonChai = require('sinon-chai');

assert = chai.assert;

expect = chai.expect;

chai.use(sinonChai);

winston = require('winston');

winstonSlackClass = require('../lib');

rawError = fs.readFileSync('./test/sample_error_raw.txt', 'utf8');

parsedError = fs.readFileSync('./test/sample_error_parsed.txt', 'utf8');

slackOptions = {
  webHookUrl: 'https://hooks.slack.com/services/F0U7KcIg6wtFTmUi7ZwWDG9fmchnt2u40wEgW5xai9o4',
  channel: '#samplechannel',
  username: 'ErrorBot',
  level: 'error',
  pid: process.pid,
  app: path.basename(process.argv[1], '.js')
};

winstonSlack = new winstonSlackClass(slackOptions);

testTypes = ['normal', 'errorParsing'];

testLevels = function(levels, transport, assertMsg, testType) {
  var tests;
  tests = [];
  Object.keys(levels).forEach(function(level, index) {
    return tests.push({
      name: assertMsg + " with the '" + level + "' level",
      fn: function(done) {
        var logOptions, sendOptions;
        if (testType == null) {
          testType = 'normal';
        }
        logOptions = {};
        logOptions.level = level;
        logOptions.msg = 'test message';
        logOptions.meta = {};
        if (testType === 'errorParsing') {
          logOptions.meta = {
            errorStack: rawError
          };
        }
        sendOptions = {};
        sendOptions.channel = slackOptions.channel;
        sendOptions.username = slackOptions.username;
        sendOptions.text = "*" + logOptions.msg + "*";
        if (testType === 'errorParsing') {
          sendOptions.text = "*" + logOptions.msg + "*\n" + parsedError;
        }
        return transport.log(logOptions.level, logOptions.msg, logOptions.meta, function(err) {
          var sendLastCall;
          expect(transport.log).to.have.been.calledWith(logOptions.level, logOptions.msg, logOptions.meta);
          if (testType === 'normal') {
            expect(transport.log.callCount).to.equal(index + 1);
            expect(transport.slack.send.callCount).to.equal(index + 1);
          }
          sendLastCall = transport.slack.send.lastCall;
          expect(sendLastCall.args[0].channel).to.equal(sendOptions.channel);
          expect(sendLastCall.args[0].username).to.equal(sendOptions.username);
          expect(sendLastCall.args[0].text).to.equal(sendOptions.text);
          sendLastCall.args[0].attachments[0].fields.forEach(function(field) {
            if (field != null) {
              return expect(field).to.contain.keys(['title', 'value']);
            }
          });
          return done();
        });
      }
    });
  });
  return tests;
};


/* */

describe('winston-slack-transport tests', function() {
  before(function() {
    sinon.spy(winstonSlack.slack, 'send');
    return sinon.spy(winstonSlack, 'log');
  });
  describe('levels tests', function() {
    var arrErrorParsingLevels, arrTestLevels, i, j, len, len1, results, test;
    before(function() {
      return sinon.stub(winstonSlack.slack, 'request', function(data, done) {
        return done();
      });
    });
    after(function() {
      return winstonSlack.slack.request.restore();
    });
    arrTestLevels = testLevels(winston.config.npm.levels, winstonSlack, 'Should respond and pass variables');
    for (i = 0, len = arrTestLevels.length; i < len; i++) {
      test = arrTestLevels[i];
      it(test.name, test.fn);
    }
    arrErrorParsingLevels = testLevels(winston.config.npm.levels, winstonSlack, 'Should respond, pass variables and parse error stack', 'errorParsing');
    results = [];
    for (j = 0, len1 = arrErrorParsingLevels.length; j < len1; j++) {
      test = arrErrorParsingLevels[j];
      results.push(it(test.name, test.fn));
    }
    return results;
  });
  return describe('common tests', function() {
    var response;
    response = {};
    response.body = '';
    before(function() {
      return sinon.stub(winstonSlack.slack, 'request', function(data, done) {
        if (response.body !== 'ok') {
          return done(new Error(response.body));
        }
        return done();
      });
    });
    after(function() {
      return winstonSlack.slack.request.restore();
    });
    it('Should be instance of winston-slack-transport', function(done) {
      assert.instanceOf(winstonSlack, winstonSlackClass);
      assert.isFunction(winstonSlack.log);
      return done();
    });
    it('Should throw error if webHookUrl not specified', function(done) {
      var options;
      options = _.clone(slackOptions, true);
      options.webHookUrl = void 0;
      expect(function() {
        new winstonSlackClass(options);
      }).to["throw"](Error);
      return done();
    });
    it('Should throw error if pid not specified', function(done) {
      var options;
      options = _.clone(slackOptions, true);
      options.pid = void 0;
      expect(function() {
        new winstonSlackClass(options);
      }).to["throw"](Error);
      return done();
    });
    it('Should response with "ok" if message successfully send', function(done) {
      response.body = 'ok';
      return winstonSlack.log('error', 'test message', {}, function(err, send) {
        expect(send).to.be.ok;
        return done();
      });
    });
    return it('Should response with "[ErrorSlack]" if message not send (connection problem)', function(done) {
      response.body = '[ErrorSlack]';
      return winstonSlack.log('error', 'test message', {}, function(err, send) {
        expect(send).to.not.be.ok;
        return done();
      });
    });
  });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC9pbmRleC5qcyIsInNvdXJjZXMiOlsidGVzdC9pbmRleC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQTs7QUFBQSxDQUFBLEdBQWMsT0FBQSxDQUFRLFFBQVI7O0FBQ2QsRUFBQSxHQUFjLE9BQUEsQ0FBUSxJQUFSOztBQUNkLElBQUEsR0FBYyxPQUFBLENBQVEsTUFBUjs7QUFDZCxJQUFBLEdBQWMsT0FBQSxDQUFRLE1BQVI7O0FBQ2QsS0FBQSxHQUFjLE9BQUEsQ0FBUSxPQUFSOztBQUNkLFNBQUEsR0FBYyxPQUFBLENBQVEsWUFBUjs7QUFDZCxNQUFBLEdBQVksSUFBSSxDQUFDOztBQUNqQixNQUFBLEdBQVksSUFBSSxDQUFDOztBQUVqQixJQUFJLENBQUMsR0FBTCxDQUFTLFNBQVQ7O0FBRUEsT0FBQSxHQUFVLE9BQUEsQ0FBUSxTQUFSOztBQUNWLGlCQUFBLEdBQW9CLE9BQUEsQ0FBUSxRQUFSOztBQUVwQixRQUFBLEdBQVcsRUFBRSxDQUFDLFlBQUgsQ0FBZ0IsNkJBQWhCLEVBQStDLE1BQS9DOztBQUNYLFdBQUEsR0FBYyxFQUFFLENBQUMsWUFBSCxDQUFnQixnQ0FBaEIsRUFBa0QsTUFBbEQ7O0FBSWQsWUFBQSxHQUNFO0VBQUEsVUFBQSxFQUFZLCtFQUFaO0VBQ0EsT0FBQSxFQUFTLGdCQURUO0VBRUEsUUFBQSxFQUFVLFVBRlY7RUFHQSxLQUFBLEVBQU8sT0FIUDtFQUlBLEdBQUEsRUFBSyxPQUFPLENBQUMsR0FKYjtFQUtBLEdBQUEsRUFBSyxJQUFJLENBQUMsUUFBTCxDQUFjLE9BQU8sQ0FBQyxJQUFLLENBQUEsQ0FBQSxDQUEzQixFQUErQixLQUEvQixDQUxMOzs7QUFPRixZQUFBLEdBQWUsSUFBSSxpQkFBSixDQUFzQixZQUF0Qjs7QUFFZixTQUFBLEdBQVksQ0FBQyxRQUFELEVBQVUsY0FBVjs7QUFFWixVQUFBLEdBQWEsU0FBQyxNQUFELEVBQVMsU0FBVCxFQUFvQixTQUFwQixFQUErQixRQUEvQjtBQUNY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YUFJQSxJQUFBLENBQUE7SUFQNEMsQ0FBOUM7SUFTQSxFQUFBLENBQUcsd0RBQUgsRUFBNkQsU0FBQyxJQUFEO01BQzNELFFBQVEsQ0FBQyxJQUFULEdBQWdCO2FBQ2hCLFlBQVksQ0FBQyxHQUFiLENBQWlCLE9BQWpCLEVBQTBCLGNBQTFCLEVBQTBDLEVBQTFDLEVBQThDLFNBQUMsR0FBRCxFQUFNLElBQU47UUFDNUMsTUFBQSxDQUFPLElBQVAsQ0FBWSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7ZUFDbkIsSUFBQSxDQUFBO01BRjRDLENBQTlDO0lBRjJELENBQTdEO1dBTUEsRUFBQSxDQUFHLDhFQUFILEVBQW1GLFNBQUMsSUFBRDtNQUNqRixRQUFRLENBQUMsSUFBVCxHQUFnQjthQUNoQixZQUFZLENBQUMsR0FBYixDQUFpQixPQUFqQixFQUEwQixjQUExQixFQUEwQyxFQUExQyxFQUE4QyxTQUFDLEdBQUQsRUFBTSxJQUFOO1FBQzVDLE1BQUEsQ0FBTyxJQUFQLENBQVksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztlQUN2QixJQUFBLENBQUE7TUFGNEMsQ0FBOUM7SUFGaUYsQ0FBbkY7RUEzQ3VCLENBQXpCO0FBeEJ3QyxDQUExQyIsInNvdXJjZXNDb250ZW50IjpbIl8gICAgICAgICAgID0gcmVxdWlyZSgnbG9kYXNoJylcbmZzICAgICAgICAgID0gcmVxdWlyZSgnZnMnKVxuY2hhaSAgICAgICAgPSByZXF1aXJlKCdjaGFpJylcbnBhdGggICAgICAgID0gcmVxdWlyZSgncGF0aCcpXG5zaW5vbiAgICAgICA9IHJlcXVpcmUoJ3Npbm9uJylcbnNpbm9uQ2hhaSAgID0gcmVxdWlyZSgnc2lub24tY2hhaScpXG5hc3NlcnQgICAgPSBjaGFpLmFzc2VydFxuZXhwZWN0ICAgID0gY2hhaS5leHBlY3RcblxuY2hhaS51c2Uoc2lub25DaGFpKVxuXG53aW5zdG9uID0gcmVxdWlyZSgnd2luc3RvbicpXG53aW5zdG9uU2xhY2tDbGFzcyA9IHJlcXVpcmUoJy4uL2xpYicpXG5cbnJhd0Vycm9yID0gZnMucmVhZEZpbGVTeW5jICcuL3Rlc3Qvc2FtcGxlX2Vycm9yX3Jhdy50eHQnLCAndXRmOCdcbnBhcnNlZEVycm9yID0gZnMucmVhZEZpbGVTeW5jICcuL3Rlc3Qvc2FtcGxlX2Vycm9yX3BhcnNlZC50eHQnLCAndXRmOCdcblxuXG4jYWxsIG9wdGlvbnMgaXMgcmFuZG9tXG5zbGFja09wdGlvbnMgPVxuICB3ZWJIb29rVXJsOiAnaHR0cHM6Ly9ob29rcy5zbGFjay5jb20vc2VydmljZXMvRjBVN0tjSWc2d3RGVG1VaTdad1dERzlmbWNobnQydTQwd0VnVzV4YWk5bzQnXG4gIGNoYW5uZWw6ICcjc2FtcGxlY2hhbm5lbCdcbiAgdXNlcm5hbWU6ICdFcnJvckJvdCdcbiAgbGV2ZWw6ICdlcnJvcidcbiAgcGlkOiBwcm9jZXNzLnBpZFxuICBhcHA6IHBhdGguYmFzZW5hbWUocHJvY2Vzcy5hcmd2WzFdLCAnLmpzJylcblxud2luc3RvblNsYWNrID0gbmV3IHdpbnN0b25TbGFja0NsYXNzIHNsYWNrT3B0aW9uc1xuXG50ZXN0VHlwZXMgPSBbJ25vcm1hbCcsJ2Vycm9yUGFyc2luZyddXG5cbnRlc3RMZXZlbHMgPSAobGV2ZWxzLCB0cmFuc3BvcnQsIGFzc2VydE1zZywgdGVzdFR5cGUpIC0+XG4gIHRlc3RzID0gW11cbiAgT2JqZWN0LmtleXMobGV2ZWxzKS5mb3JFYWNoIChsZXZlbCwgaW5kZXgpIC0+XG4gICAgdGVzdHMucHVzaFxuICAgICAgbmFtZTogXCIje2Fzc2VydE1zZ30gd2l0aCB0aGUgJyN7bGV2ZWx9JyBsZXZlbFwiXG4gICAgICBmbjogKGRvbmUpIC0+XG4gICAgICAgIHRlc3RUeXBlID0gJ25vcm1hbCcgdW5sZXNzIHRlc3RUeXBlP1xuXG4gICAgICAgIGxvZ09wdGlvbnMgPSB7fVxuICAgICAgICBsb2dPcHRpb25zLmxldmVsID0gbGV2ZWxcbiAgICAgICAgbG9nT3B0aW9ucy5tc2cgPSAndGVzdCBtZXNzYWdlJ1xuICAgICAgICBsb2dPcHRpb25zLm1ldGEgPSB7fVxuXG4gICAgICAgIGlmKHRlc3RUeXBlID09ICdlcnJvclBhcnNpbmcnKVxuICAgICAgICAgIGxvZ09wdGlvbnMubWV0YSA9IHtlcnJvclN0YWNrOiByYXdFcnJvcn1cbiAgICAgICAgXG4gICAgICAgIHNlbmRPcHRpb25zID0ge31cbiAgICAgICAgc2VuZE9wdGlvbnMuY2hhbm5lbCA9IHNsYWNrT3B0aW9ucy5jaGFubmVsXG4gICAgICAgIHNlbmRPcHRpb25zLnVzZXJuYW1lID0gc2xhY2tPcHRpb25zLnVzZXJuYW1lXG4gICAgICAgIHNlbmRPcHRpb25zLnRleHQgPSBcIioje2xvZ09wdGlvbnMubXNnfSpcIlxuXG4gICAgICAgIGlmKHRlc3RUeXBlID09ICdlcnJvclBhcnNpbmcnKVxuICAgICAgICAgIHNlbmRPcHRpb25zLnRleHQgPSBcIioje2xvZ09wdGlvbnMubXNnfSpcXG4je3BhcnNlZEVycm9yfVwiXG5cbiAgICAgICAgdHJhbnNwb3J0LmxvZyBsb2dPcHRpb25zLmxldmVsLCBsb2dPcHRpb25zLm1zZywgbG9nT3B0aW9ucy5tZXRhLCAoZXJyKSAtPlxuICAgICAgICAgIGV4cGVjdCh0cmFuc3BvcnQubG9nKS50by5oYXZlLmJlZW4uY2FsbGVkV2l0aChsb2dPcHRpb25zLmxldmVsLCBsb2dPcHRpb25zLm1zZywgbG9nT3B0aW9ucy5tZXRhKVxuXG4gICAgICAgICAgaWYodGVzdFR5cGUgPT0gJ25vcm1hbCcpXG4gICAgICAgICAgICBleHBlY3QodHJhbnNwb3J0LmxvZy5jYWxsQ291bnQpLnRvLmVxdWFsKGluZGV4KzEpXG4gICAgICAgICAgICBleHBlY3QodHJhbnNwb3J0LnNsYWNrLnNlbmQuY2FsbENvdW50KS50by5lcXVhbChpbmRleCsxKVxuXG4gICAgICAgICAgIyBnZXQgYXJncyBmcm9tIHNsYWNrLnNlbmRcbiAgICAgICAgICBzZW5kTGFzdENhbGwgPSB0cmFuc3BvcnQuc2xhY2suc2VuZC5sYXN0Q2FsbFxuXG4gICAgICAgICAgZXhwZWN0KHNlbmRMYXN0Q2FsbC5hcmdzWzBdLmNoYW5uZWwpLnRvLmVxdWFsKHNlbmRPcHRpb25zLmNoYW5uZWwpXG4gICAgICAgICAgZXhwZWN0KHNlbmRMYXN0Q2FsbC5hcmdzWzBdLnVzZXJuYW1lKS50by5lcXVhbChzZW5kT3B0aW9ucy51c2VybmFtZSlcbiAgICAgICAgICBleHBlY3Qoc2VuZExhc3RDYWxsLmFyZ3NbMF0udGV4dCkudG8uZXF1YWwoc2VuZE9wdGlvbnMudGV4dClcblxuICAgICAgICAgIHNlbmRMYXN0Q2FsbC5hcmdzWzBdLmF0dGFjaG1lbnRzWzBdLmZpZWxkcy5mb3JFYWNoIChmaWVsZCkgLT5cbiAgICAgICAgICAgIGV4cGVjdChmaWVsZCkudG8uY29udGFpbi5rZXlzKFsndGl0bGUnLCAndmFsdWUnXSkgaWYgZmllbGQ/XG5cbiAgICAgICAgICBkb25lKClcblxuICByZXR1cm4gdGVzdHNcblxuXG4jIyMgIyMjXG4jIFRFU1RTXG5kZXNjcmliZSAnd2luc3Rvbi1zbGFjay10cmFuc3BvcnQgdGVzdHMnLCAoKSAtPlxuXG4gIGJlZm9yZSAtPlxuICAgIHNpbm9uLnNweSB3aW5zdG9uU2xhY2suc2xhY2ssICdzZW5kJ1xuICAgIHNpbm9uLnNweSB3aW5zdG9uU2xhY2ssICdsb2cnXG5cbiAgZGVzY3JpYmUgJ2xldmVscyB0ZXN0cycsICgpIC0+XG5cbiAgICBiZWZvcmUgLT5cbiAgICAgIHNpbm9uLnN0dWIgd2luc3RvblNsYWNrLnNsYWNrLCAncmVxdWVzdCcsIChkYXRhLCBkb25lKSAtPlxuICAgICAgICBkb25lKClcblxuICAgIGFmdGVyIC0+XG4gICAgICAod2luc3RvblNsYWNrLnNsYWNrKS5yZXF1ZXN0LnJlc3RvcmUoKVxuXG4gICAgYXJyVGVzdExldmVscyA9IHRlc3RMZXZlbHMgd2luc3Rvbi5jb25maWcubnBtLmxldmVscywgd2luc3RvblNsYWNrLCAnU2hvdWxkIHJlc3BvbmQgYW5kIHBhc3MgdmFyaWFibGVzJ1xuICAgIGZvciB0ZXN0IGluIGFyclRlc3RMZXZlbHNcbiAgICAgIGl0IHRlc3QubmFtZSwgdGVzdC5mblxuXG4gICAgYXJyRXJyb3JQYXJzaW5nTGV2ZWxzID0gdGVzdExldmVscyB3aW5zdG9uLmNvbmZpZy5ucG0ubGV2ZWxzLCB3aW5zdG9uU2xhY2ssICdTaG91bGQgcmVzcG9uZCwgcGFzcyB2YXJpYWJsZXMgYW5kIHBhcnNlIGVycm9yIHN0YWNrJywgJ2Vycm9yUGFyc2luZydcbiAgICBmb3IgdGVzdCBpbiBhcnJFcnJvclBhcnNpbmdMZXZlbHNcbiAgICAgIGl0IHRlc3QubmFtZSwgdGVzdC5mblxuXG4gIFxuICBkZXNjcmliZSAnY29tbW9uIHRlc3RzJywgKCkgLT5cblxuICAgIHJlc3BvbnNlID0ge31cbiAgICByZXNwb25zZS5ib2R5ID0gJydcblxuICAgIGJlZm9yZSAtPlxuICAgICAgc2lub24uc3R1YiB3aW5zdG9uU2xhY2suc2xhY2ssICdyZXF1ZXN0JywgKGRhdGEsIGRvbmUpIC0+XG4gICAgICAgIGlmIHJlc3BvbnNlLmJvZHkgaXNudCAnb2snXG4gICAgICAgICAgcmV0dXJuIGRvbmUobmV3IEVycm9yKHJlc3BvbnNlLmJvZHkpKVxuICAgICAgICBkb25lKClcblxuICAgIGFmdGVyIC0+XG4gICAgICAod2luc3RvblNsYWNrLnNsYWNrKS5yZXF1ZXN0LnJlc3RvcmUoKVxuXG4gICAgaXQgJ1Nob3VsZCBiZSBpbnN0YW5jZSBvZiB3aW5zdG9uLXNsYWNrLXRyYW5zcG9ydCcsIChkb25lKSAtPlxuICAgICAgYXNzZXJ0Lmluc3RhbmNlT2Ygd2luc3RvblNsYWNrLCB3aW5zdG9uU2xhY2tDbGFzc1xuICAgICAgYXNzZXJ0LmlzRnVuY3Rpb24gd2luc3RvblNsYWNrLmxvZ1xuICAgICAgZG9uZSgpXG5cbiAgICBpdCAnU2hvdWxkIHRocm93IGVycm9yIGlmIHdlYkhvb2tVcmwgbm90IHNwZWNpZmllZCcsIChkb25lKSAtPlxuICAgICAgb3B0aW9ucyA9IF8uY2xvbmUoc2xhY2tPcHRpb25zLCB0cnVlKVxuICAgICAgb3B0aW9ucy53ZWJIb29rVXJsID0gdW5kZWZpbmVkXG4gICAgICBleHBlY3QoKCktPlxuICAgICAgICBuZXcgd2luc3RvblNsYWNrQ2xhc3Mob3B0aW9ucylcbiAgICAgICAgcmV0dXJuXG4gICAgICApLnRvLnRocm93KEVycm9yKVxuICAgICAgZG9uZSgpXG5cbiAgICBpdCAnU2hvdWxkIHRocm93IGVycm9yIGlmIHBpZCBub3Qgc3BlY2lmaWVkJywgKGRvbmUpIC0+XG4gICAgICBvcHRpb25zID0gXy5jbG9uZShzbGFja09wdGlvbnMsIHRydWUpXG4gICAgICBvcHRpb25zLnBpZCA9IHVuZGVmaW5lZFxuICAgICAgZXhwZWN0KCgpLT5cbiAgICAgICAgbmV3IHdpbnN0b25TbGFja0NsYXNzKG9wdGlvbnMpXG4gICAgICAgIHJldHVyblxuICAgICAgKS50by50aHJvdyhFcnJvcilcbiAgICAgIGRvbmUoKVxuXG4gICAgaXQgJ1Nob3VsZCByZXNwb25zZSB3aXRoIFwib2tcIiBpZiBtZXNzYWdlIHN1Y2Nlc3NmdWxseSBzZW5kJywgKGRvbmUpIC0+XG4gICAgICByZXNwb25zZS5ib2R5ID0gJ29rJ1xuICAgICAgd2luc3RvblNsYWNrLmxvZyAnZXJyb3InLCAndGVzdCBtZXNzYWdlJywge30sIChlcnIsIHNlbmQpIC0+XG4gICAgICAgIGV4cGVjdChzZW5kKS50by5iZS5va1xuICAgICAgICBkb25lKClcbiAgICAgICAgXG4gICAgaXQgJ1Nob3VsZCByZXNwb25zZSB3aXRoIFwiW0Vycm9yU2xhY2tdXCIgaWYgbWVzc2FnZSBub3Qgc2VuZCAoY29ubmVjdGlvbiBwcm9ibGVtKScsIChkb25lKSAtPlxuICAgICAgcmVzcG9uc2UuYm9keSA9ICdbRXJyb3JTbGFja10nXG4gICAgICB3aW5zdG9uU2xhY2subG9nICdlcnJvcicsICd0ZXN0IG1lc3NhZ2UnLCB7fSwgKGVyciwgc2VuZCkgLT5cbiAgICAgICAgZXhwZWN0KHNlbmQpLnRvLm5vdC5iZS5va1xuICAgICAgICBkb25lKClcbiAgICAgICAgXG5cblxuIl19
