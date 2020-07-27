_           = require('lodash')
fs          = require('fs')
chai        = require('chai')
path        = require('path')
sinon       = require('sinon')
sinonChai   = require('sinon-chai')
assert    = chai.assert
expect    = chai.expect

chai.use(sinonChai)

winston = require('winston')
winstonSlackClass = require('../lib')

rawError = fs.readFileSync './test/sample_error_raw.txt', 'utf8'
parsedError = fs.readFileSync './test/sample_error_parsed.txt', 'utf8'


#all options is random
slackOptions =
  webHookUrl: 'https://hooks.slack.com/services/F0U7KcIg6wtFTmUi7ZwWDG9fmchnt2u40wEgW5xai9o4'
  channel: '#samplechannel'
  username: 'ErrorBot'
  level: 'error'
  pid: process.pid
  app: path.basename(process.argv[1], '.js')

winstonSlack = new winstonSlackClass slackOptions

testTypes = ['normal','errorParsing']

testLevels = (levels, transport, assertMsg, testType) ->
  tests = []
  Object.keys(levels).forEach (level, index) ->
    tests.push
      name: "#{assertMsg} with the '#{level}' level"
      fn: (done) ->
        testType = 'normal' unless testType?

        logOptions = {}
        logOptions.level = level
        logOptions.msg = 'test message'
        logOptions.meta = {}

        if(testType == 'errorParsing')
          logOptions.meta = {errorStack: rawError}
        
        sendOptions = {}
        sendOptions.channel = slackOptions.channel
        sendOptions.username = slackOptions.username
        sendOptions.text = "*#{logOptions.msg}*"

        if(testType == 'errorParsing')
          sendOptions.text = "*#{logOptions.msg}*\n#{parsedError}"

        transport.log logOptions.level, logOptions.msg, logOptions.meta, (err) ->
          expect(transport.log).to.have.been.calledWith(logOptions.level, logOptions.msg, logOptions.meta)

          if(testType == 'normal')
            expect(transport.log.callCount).to.equal(index+1)
            expect(transport.slack.send.callCount).to.equal(index+1)

          # get args from slack.send
          sendLastCall = transport.slack.send.lastCall

          expect(sendLastCall.args[0].channel).to.equal(sendOptions.channel)
          expect(sendLastCall.args[0].username).to.equal(sendOptions.username)
          expect(sendLastCall.args[0].text).to.equal(sendOptions.text)

          sendLastCall.args[0].attachments[0].fields.forEach (field) ->
            expect(field).to.contain.keys(['title', 'value']) if field?

          done()

  return tests

sandbox = sinon.createSandbox()

### ###
# TESTS
describe 'winston-slack-transport tests', () ->

  before ->
    sandbox.spy winstonSlack.slack, 'send'
    sandbox.spy winstonSlack, 'log'

  describe 'levels tests', () ->

    before ->
      sandbox.stub(winstonSlack.slack, 'request').callsFake((data, done) ->
        done())

    after ->
      sandbox.restore()
      #(winstonSlack.slack).request.restore()

    arrTestLevels = testLevels winston.config.npm.levels, winstonSlack, 'Should respond and pass variables'
    for test in arrTestLevels
      it test.name, test.fn

    arrErrorParsingLevels = testLevels winston.config.npm.levels, winstonSlack, 'Should respond, pass variables and parse error stack', 'errorParsing'
    for test in arrErrorParsingLevels
      it test.name, test.fn

  
  describe 'common tests', () ->

    response = {}
    response.body = ''

    before ->
      sandbox.stub(winstonSlack.slack, 'request').callsFake((data, done) ->
        if response.body isnt 'ok'
          return done(new Error(response.body))
        done())

    after ->
      (winstonSlack.slack).request.restore()

    it 'Should be instance of winston-slack-transport', (done) ->
      assert.instanceOf winstonSlack, winstonSlackClass
      assert.isFunction winstonSlack.log
      done()

    it 'Should throw error if webHookUrl not specified', (done) ->
      options = _.clone(slackOptions, true)
      options.webHookUrl = undefined
      expect(()->
        new winstonSlackClass(options)
        return
      ).to.throw(Error)
      done()

    it 'Should throw error if pid not specified', (done) ->
      options = _.clone(slackOptions, true)
      options.pid = undefined
      expect(()->
        new winstonSlackClass(options)
        return
      ).to.throw(Error)
      done()

    it 'Should response with "ok" if message successfully send', (done) ->
      response.body = 'ok'
      winstonSlack.log 'error', 'test message', {}, (err, send) ->
        expect(send).to.be.ok
        done()
        
    it 'Should response with "[ErrorSlack]" if message not send (connection problem)', (done) ->
      response.body = '[ErrorSlack]'
      winstonSlack.log 'error', 'test message', {}, (err, send) ->
        expect(send).to.not.be.ok
        done()
        


