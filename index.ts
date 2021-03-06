import * as Express from 'express'
import * as BodyParser from 'body-parser'
import * as Https from 'https'
import * as Unzip from 'unzip'
import * as SaxStream from 'sax-stream'
import { compare } from 'bcrypt-nodejs'


const Config = require('./config')

process
  .on('uncaughtException', err => console.log(err))

var fuels: string = "";

var router = Express()

router.use(BodyParser.json())

router.listen(process.env.PORT || 8081, () => console.log("Started..."))

router.get('/stations', (req, res) => res.send(fuels))

router.post('/update/:token', (req, res) => {
  if (!req.params.token)
    return res
      .sendStatus(401)

  var token: string = req.params.token

  compare(token, Config.hashedToken, (err, ok) => {
    if (err) return res
      .sendStatus(500)
      .send(err)
    if (!ok) return res
      .sendStatus(403)

    Https.get({
      method: 'GET',
      host: Config.archiveHost,
      path: Config.archivePath,
      headers: {
        'accept-encoding': 'gzip'
      }
    }, ODRes => {

      if (res.statusCode != 200) return res
        .sendStatus(500)
        .write('not 200 from resource')

      ODRes
        .pipe(Unzip.Parse())
        .on('entry', entry => {
          if (entry.path != 'PrixCarburants_instantane.xml') {
            return entry.autodrain()
          }

          fuels = "";
          entry
            .pipe(SaxStream({
              strict: true,
              tag: 'pdv'
            }))
            .on('data', pdv => {
              fuels += entryToSensition(pdv)
            })
            .on('error', err => console.error('ERROR!', err))
            .on('end', () => res
              .sendStatus(200)
              .end()
            )
          })
    })
    .on('error', err => console.error('Request Error', err))
  })
})

function entryToSensition(pdv) {
  if (!pdv.children.prix) return ''

  var fuels = ''

  if (Array.isArray(pdv.children.prix))
    pdv.children.prix.forEach(price => {
      fuels +=
      `${Date.now()*1000}/${pdv.attribs.latitude / 100000}:${pdv.attribs.longitude / 100000}/ ` +
      `station.fuel.${price.attribs.nom.toLowerCase()}` +
      `{cp=${pdv.attribs.cp},city=${pdv.children.ville.value},street=${pdv.children.adresse.value},access=${(pdv.attribs.pop === 'R')? 'route':'autoroute'}} `+
      `${price.attribs.valeur}\n`
    })
  else
    fuels +=
      `${Date.now()*1000}/${pdv.attribs.latitude / 100000}:${pdv.attribs.longitude / 100000}/ ` +
      `station.fuel.${pdv.children.prix.attribs.nom.toLowerCase()}` +
      `{cp=${pdv.attribs.cp},city=${pdv.children.ville.value},street=${pdv.children.adresse.value},access=${(pdv.attribs.pop === 'R')? 'route':'autoroute'}} `+
      `${pdv.children.prix.attribs.valeur}\n`
  return fuels
}
