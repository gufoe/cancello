require('dotenv').config()
const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')
const storage = new require('node-localstorage').LocalStorage('./data');
const Gpio = require('onoff').Gpio;
const RELAY_CANCELLO = new Gpio(26, 'high');

const storage_set = function(k, v) {
  storage.setItem(k, JSON.stringify(v))
}
const storage_get = function(k, def) {
  let v = storage.getItem(k)
  if (v) return JSON.parse(v)
  else return def
}

const _pick = arr => {
  return arr[Math.floor(Math.random() * arr.length)]
}

const _fattissimi = [
  'Ho fatto campione!',
  'Il pulsante è stato premuto',
  'Ok, vai piano',
  'Guida responsabilmente',
  'Rispetta le distanze',
  'Metti la mascherina mi raccomando',
]

let _adm = storage_get('__admins', ['gufoe'])
const _cmd = {
  cancello: 'Cancello',
  version: /versione/i,
}
const is_allowed = name => {
  if (typeof name == 'object') name = name.from.username
  if (!name) return null
  if (_adm.includes(name)) return true
  let user = storage_get(name)
  if (!user) return null
  if (user.expires_at && time_now() > user.expires_at) return null
  return true
}

const grant_user = (name, hours) => {
  let perm = {}
  if (hours) {
    perm.expires_at = time_now() + hours * 3600*1000
  }
  storage_set(name, perm)
}

const time_now = () => (new Date).getTime()

const is_enabled = (ctx) => {

}

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.use(Telegraf.log())

bot.start(ctx => {
  return ctx.reply('Benvenuto',
    Markup.keyboard([
      [_cmd.cancello],
      // ['🔍 Search', '😎 Popular'],
      // ['☸ Setting', '📞 Feedback'],
      // ['📢 Ads', '⭐️ Rate us', '👥 Share'],
    ])
    .resize()
    .extra()
  )
})

bot.hears(/^aggiungi @?(\w+)\s?(\d+)?$/i, ctx => {
  if (!_adm.includes(ctx.from.username)) {
    return ctx.reply('Non sei autorizzato, scrivici: '+_adm.map(x => '@'+x).join(' '))
  }
  let name = ctx.match[1]
  let hours = ctx.match[2]
  grant_user(name, hours)
  ctx.reply('Utente '+name+' aggiunto per '+(hours > 1 ? hours+' ore' : (hours == 1 ? 'un\'ora' : 'sempre')))
})
bot.hears(/^elimina @?(\w+)$/i, ctx => {
  if (!_adm.includes(ctx.from.username)) {
    return ctx.reply('Non sei autorizzato, scrivici: '+_adm.map(x => '@'+x).join(' '))
  }
  let name = ctx.match[1]
  storage_set(name, null)
  ctx.reply('Utente '+name+' rimosso')
})

bot.hears(_cmd.cancello, ctx => {
  if (!is_allowed(ctx)) {
    return ctx.reply('Non sei autorizzato bastardo, scrivimi: '+_adm.map(x => '@'+x).join(' '))
  }
  RELAY_CANCELLO.writeSync(0)
  setTimeout(() => {
    RELAY_CANCELLO.writeSync(1)
    ctx.reply(_pick(_fattissimi))
    bot.telegram.sendMessage('@gufoe', '@' + ctx.from.username + ' ha attivato il cancello')
  }, 300)
})

bot.hears(_cmd.version, ctx => {
  ctx.reply('Versione 1.0.3')
})


bot.launch()
