_           = require('lodash')
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
    errorStack = (meta.errorStack).trim()
    errorStack = errorStack.replace(/\r?\n|\r/g, '\n')
    arrStack = errorStack.split('\n')

    strStack = ''
    paragraph = false
    _.forEach arrStack, (val, index) ->
      val = val.trim()
      if index == 0 or val.indexOf('.coffee') > -1
        strStack += "`#{val}`\n"
      else if index+1 < arrStack.length-1 and arrStack[index+1].indexOf('.coffee') > -1
        if paragraph
          paragraph = false
          strStack +=  "#{val}```\n"
        else
          strStack +=  "```#{val}```\n"
      else
        unless paragraph
          paragraph = true
          strStack += "```#{val}\n"
        else if index == arrStack.length-1
          strStack += "#{val}```\n"
        else
          strStack += "#{val}\n"

    @slack.send
      channel:    @channel
      username:   @username
      text:       "*#{msg}*\n#{strStack}"
      icon_emoji: undefined
      attachments: [
        {
          fields: [
            { title: 'AppName', value: @app, short: true } if @app
            { title: 'EnvName', value: @env, short: true } if @env
            { title: 'CPU', value: "#{stat.cpu}%", short: true } if stat?
            { title: 'MEM', value: "#{stat.memory/(1000*1000)}mb", short: true } if stat?
            { title: 'Timestamp', value: _getTimestamp(), short: true }
            { title: 'Level', value: level, short: true } if level
          ]
        }
      ]
    , (err) ->
      cb(err, false) if err
      cb(null, true)

  return


_getTimestamp = () ->
  d = new Date()
  d.toUTCString()


module.exports = Slack
