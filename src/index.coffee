util        = require('util')
winston     = require('winston')
slackNotify = require('slack-notify')

module.exports = Slack = (options) ->
  {@webHookUrl, @channel, @username, @level} = options
  throw new Error('webHookUrl must be specified') unless options.webHookUrl

  @slack = new slackNotify(@webHookUrl)
  return

util.inherits Slack, winston.Transport
winston.transports.Slack = Slack

Slack::log = (level, msg, meta, cb) ->
  @slack.send
    channel:    @channel
    username:   @username
    text:       "[#{level}] #{msg}"
    icon_emoji: undefined
  , (err) ->
    if err
      cb(err, false)
    cb(null, true)

  return