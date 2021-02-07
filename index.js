require('dotenv').config()
const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')
const storage = new require('node-localstorage').LocalStorage('./data');
const Gpio = require('onoff').Gpio;
let RELAY_CANCELLO
let RELAY_PORTONE

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
const is_allowed = name => {
  if (typeof name == 'object') name = name.from.username
  if (!name) return null
  if (_adm.find(a => a.name == name)) return true
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
const init_gpio = () => {
  if (RELAY_CANCELLO) return null
  RELAY_CANCELLO = new Gpio(26, 'high')
  RELAY_PORTONE = new Gpio(19, 'high')
}
const _fattissimi = [
  'Ho fatto campione!',
  'Il pulsante è stato premuto',
  'Ok, vai piano',
  'Guida responsabilmente',
  'Rispetta le distanze',
  'Metti la mascherina mi raccomando',
  'Fatto, colonnello!',
  'Sissignore!',
  'Ordine ricevuto',
  'Comandi, signorsì',
  'Vedi tu',
]

let _adm = storage_get('__admins', [
  {
    id: 25913658,
    name: 'gufoe',
  }
])
const _cmd = {
  ciao: 'Ciao ☺️',
  aggiungi: /^aggiungi @?(\w+)\s?(\d+)?$/i,
  elimina: /^elimina @?(\w+)$/i,
  cancello: 'Cancello ⚙️',
  portone: 'Portone ⚙️',
  apri: 'Attiva cancello!',
  apri_portone: 'Attiva portone!',
  non_aprire: 'Torna indietro',
  versione: 'Versione',
}
{
  let all_cmds = Object.values(_cmd)
  all_cmds.forEach((x, x_i) => {
  if (x_i && all_cmds.slice(0, x_i-1).includes(x)) {
    throw new Exception('Il comando', x, 'viene usato due volte')
  }
})
}

const kb_def = Markup.keyboard([
  [_cmd.cancello],
  [_cmd.portone],
  [_cmd.versione, _cmd.ciao],
]).resize().extra()

const kb_yesno = Markup.keyboard([
  [_cmd.apri, _cmd.non_aprire],
]).resize().extra()
const kb_yesno2 = Markup.keyboard([
  [_cmd.apri_portone, _cmd.non_aprire],
]).resize().extra()


const bot = new Telegraf(process.env.BOT_TOKEN)
bot.use(Telegraf.log())
bot.start(ctx => {
  return ctx.reply('Benvenuto', kb_def)
})
bot.hears(_cmd.ciao, ctx => {
  ctx.reply('Ciao io sono il cancello 🤖', kb_def)
})
bot.hears(_cmd.aggiungi, ctx => {
  if (!_adm.find(a => a.name == ctx.from.username)) {
    return ctx.reply('Chi pensi di essere? Un amministratore?\nNo.')
  }
  let name = ctx.match[1]
  let hours = ctx.match[2]
  grant_user(name, hours)
  ctx.reply('Utente '+name+' aggiunto per '+(hours > 1 ? hours+' ore' : (hours == 1 ? 'un\'ora' : 'sempre')))
})
bot.hears(_cmd.elimina, ctx => {
  if (!_adm.find(a => a.name == ctx.from.username)) {
    return ctx.reply('Chi pensi di essere? Un amministratore?\nNo.')
  }
  let name = ctx.match[1]
  storage_set(name, null)
  ctx.reply('Utente '+name+' rimosso')
})
bot.hears(_cmd.cancello, ctx => {
  if (!is_allowed(ctx)) {
    return ctx.reply('Non sei autorizzato bastardo, scrivimi: '+_adm.map(x => '@'+x.name).join(' '))
  }
  ctx.reply('Sei davvero davvero sicuro?', kb_yesno)
})
bot.hears(_cmd.portone, ctx => {
  if (!is_allowed(ctx)) {
    return ctx.reply('Non sei autorizzato bastardo, scrivimi: '+_adm.map(x => '@'+x.name).join(' '))
  }
  ctx.reply('Sei davvero davvero sicuro?', kb_yesno2)
})
bot.hears(_cmd.apri, ctx => {
  if (!is_allowed(ctx)) {
    return ctx.reply('Non sei autorizzato bastardo, scrivimi: '+_adm.map(x => '@'+x.name).join(' '))
  }
  init_gpio()
  RELAY_CANCELLO.writeSync(0)
  setTimeout(() => {
    RELAY_CANCELLO.writeSync(1)
    ctx.reply(_pick(_fattissimi), kb_def)
    _adm.forEach(admin => {
      bot.telegram.sendMessage(admin.id, '@' + ctx.from.username + ' ha attivato il cancello', kb_def)
    })
  }, 300)
})
bot.hears(_cmd.apri_portone, ctx => {
  if (!is_allowed(ctx)) {
    return ctx.reply('Non sei autorizzato bastardo, scrivimi: '+_adm.map(x => '@'+x.name).join(' '))
  }
  init_gpio()
  RELAY_PORTONE.writeSync(0)
  setTimeout(() => {
    RELAY_PORTONE.writeSync(1)
    ctx.reply(_pick(_fattissimi), kb_def)
    _adm.forEach(admin => {
      bot.telegram.sendMessage(admin.id, '@' + ctx.from.username + ' ha attivato il portone', kb_def)
    })
  }, 300)
})
bot.hears(_cmd.non_aprire, ctx => {
  ctx.reply('😑', kb_def)
})
bot.hears(_cmd.versione, ctx => {
  ctx.reply('Versione 1.0.12', kb_def)
})

process.on('SIGINT', () => {
  console.log('Quitting in an ordered fashion')
  RELAY_CANCELLO.unexport()
})

bot.launch()
