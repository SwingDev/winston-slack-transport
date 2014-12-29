_           = require('lodash')
fs          = require('fs')
chai        = require('chai')
path        = require('path')
sinon       = require('sinon')
sinonChai   = require('sinon-chai')
chaiThings  = require('chai-things')
assert    = chai.assert
expect    = chai.expect

chai.use(sinonChai)
chai.use(chaiThings)

winston = require('winston')
slackNotify = require('slack-notify')
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


testLevels = (levels, transport, assertMsg) ->
  tests = []
  Object.keys(levels).forEach (level, index) ->
    tests.push
      name: "#{assertMsg} with the '#{level}' level"
      fn: (done) ->
        logOptions = {}
        logOptions.level = level
        logOptions.msg = 'test message'
        logOptions.meta = {}

        sendOptions =
          channel: slackOptions.channel
          username: slackOptions.username
          text: "*#{logOptions.msg}*"

        transport.log logOptions.level, logOptions.msg, logOptions.meta, (err) ->
          expect(transport.log).to.have.been.calledWith(logOptions.level, logOptions.msg, logOptions.meta)
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


errorParsingLevels = (levels, transport, assertMsg) ->
  tests = []
  Object.keys(levels).forEach (level, index) ->
    tests.push
      name: "#{assertMsg} with the '#{level}' level"
      fn: (done) ->
        logOptions = {}
        logOptions.level = level
        logOptions.msg = 'test message'
        logOptions.meta = {errorStack: rawError}

        sendOptions =
          channel: slackOptions.channel
          username: slackOptions.username
          text: "*#{logOptions.msg}*\n#{parsedError}"


        transport.log logOptions.level, logOptions.msg, logOptions.meta, (err) ->
          expect(transport.log).to.have.been.calledWith(logOptions.level, logOptions.msg, logOptions.meta)

          # get args from slack.send
          sendLastCall = transport.slack.send.lastCall

          expect(sendLastCall.args[0].channel).to.equal(sendOptions.channel)
          expect(sendLastCall.args[0].username).to.equal(sendOptions.username)
          expect(sendLastCall.args[0].text).to.equal(sendOptions.text)

          sendLastCall.args[0].attachments[0].fields.forEach (field) ->
            expect(field).to.contain.keys(['title', 'value']) if field?

          done()
          
  return tests


### ###
# TESTS
describe 'Winston-slack-transport', () ->

  before ->
    sinon.stub winstonSlack.slack, 'request', (data, done) ->
      done()
    sinon.spy winstonSlack.slack, 'send'
    sinon.spy winstonSlack, 'log'

  after ->
    (winstonSlack.slack).request.restore()
    return

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

  arrTestLevels = testLevels winston.config.npm.levels, winstonSlack, 'Should respond and pass variables'
  for test in arrTestLevels
    it test.name, test.fn

  arrErrorParsingLevels = errorParsingLevels winston.config.npm.levels, winstonSlack, 'Should respond, pass variables and parse error stack'
  for test in arrErrorParsingLevels
    it test.name, test.fn

