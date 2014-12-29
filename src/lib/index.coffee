_           = require('lodash')
util        = require('util')
winston     = require('winston')
slackNotify = require('slack-notify')
usage       = require('usage')
os          = require('os')

Slack = (options) ->
  {@webHookUrl, @channel, @username, @level, @pid, @env, @app} = options
  throw new Error('webHookUrl must be specified') unless options.webHookUrl
  throw new Error('pid must be specified') unless options.pid

  @slack = new slackNotify(@webHookUrl)
  return

util.inherits Slack, winston.Transport
winston.transports.Slack = Slack

Slack::log = (level, msg, meta, cb) ->
  usage.lookup @pid, (err, stat) =>
    errorStack = (meta.errorStack).trim() if meta.errorStack?
    msg = "*#{msg}*"

    if errorStack?
      errorStack = errorStack.replace(/\r?\n|\r/g, '\n')
      arrStack = errorStack.split('\n')

      paragraph = false
      strStack = _.map(arrStack, (val, index) ->
        val = val.trim()
        if val.indexOf('.coffee') > -1 or index==0
          return "`#{val}`"
        else if not paragraph
          paragraph = true
          return "```#{val}"
        else if arrStack[index+1]? and arrStack[index+1].indexOf('.coffee') > -1
          paragraph = false
          return "#{val}```"
        else if index == arrStack.length-1 and paragraph
          paragraph = false
          return "#{val}```"
        else
          paragraph = true
          return "#{val}"
        ).join('\n')
      msg += "\n#{strStack}"

    usageCpu = stat.cpu
    usageMem = stat.memory / (1000*1000)
    totalMem = os.totalmem() / (1000*1000)
    usageMemP = usageMem/totalMem * 100

    @slack.send
      channel:    @channel
      username:   @username
      text:       "#{msg}"
      icon_emoji: undefined
      attachments: [
        {
          fields: [
            { title: 'AppName', value: @app, short: true } if @app
            { title: 'EnvName', value: @env, short: true } if @env
            { title: 'CPU', value: "#{usageCpu.toFixed(2)}%", short: true } if stat?
            { title: 'MEM', value: "#{usageMem.toFixed(2)} / #{totalMem.toFixed(2)} MB (#{usageMemP.toFixed(2)}%)", short: true } if stat?
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
