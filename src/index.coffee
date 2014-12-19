util        = require('util')
winston     = require('winston')
slackNotify = require('slack-notify')
usage       = require('usage')

Slack = (options) ->
  {@webHookUrl, @channel, @username, @level, @pid, @env, @app} = options
  throw new Error('webHookUrl must be specified') unless options.webHookUrl

  @slack = new slackNotify(@webHookUrl)
  return

util.inherits Slack, winston.Transport
winston.transports.Slack = Slack

Slack::log = (level, msg, meta, cb) ->
  usage.lookup @pid, (err, stat) =>
    @slack.send
      channel:    @channel
      username:   @username
      text:       "*#{msg}*\n#{(meta.errorStack).trim()}"
      attachments: [
        {
          fields: [
            { title: 'AppName', value: @app, short: true } if @app
            { title: 'EnvName', value: @env, short: true } if @env
            { title: 'CPU', value: "#{stat.cpu}%", short: true } if stat.cpu
            { title: 'MEM', value: "#{stat.memory/(1000*1000)}mb", short: true } if stat.memory
            { title: 'Timestamp', value: _getTimestamp(), short: true }
            { title: 'Level', value: level, short: true } if level
          ]
        }
      ]
      icon_emoji: undefined
    , (err) ->
      if err
        cb(err, false)
      cb(null, true)
  return

_getTimestamp = () ->
  d = new Date()
  d.toLocaleDateString() + ' ' + d.toLocaleTimeString()


module.exports = Slack