import {
  Client as HyperspaceClient,
  Server as HyperspaceServer
} from 'hyperspace'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import Hyperbee from 'hyperbee'
import Fileparser from './fileParser.js'
import fs from 'fs'
import util from 'util'
import events from 'events'
import csv from 'csv-parser'

var HyperspaceWorker = function () {
  this.client = {}
  this.server = {}
  this.drive = {}
  this.store = {}
  this.core = {}
  this.dbPublicLibrary = {}
  this.dbPeerLibrary = {}
  this.dbPeers = {}
  this.dbBentospaces = {}
  this.dbHOPresults = {}
  this.dbKBledger = {}
  this.fileUtility = new Fileparser('')
  console.log('{in-hyperspace}')
}

/**
 * inherits core emitter class within this class
 * @method inherits
 */
util.inherits(HyperspaceWorker, events.EventEmitter)

/**
 * setup hypercore protocol
 * @method startHyperspace
 *
 */
 HyperspaceWorker.prototype.startHyperspace = async function () {
  await this.setupHyperspace()
  // console.log('Hyperspace daemon connected, status:')
  // console.log(await this.client.status())

}

/**
 * setup hypercore protocol
 * @method startHyperspace
 *
 */
 HyperspaceWorker.prototype.setupHyperspace = async function () {
  try {
    this.client = new HyperspaceClient()
    await this.client.ready()
  } catch (e) {
    // no daemon, start it in-process
    this.server = new HyperspaceServer()
    await this.server.ready()
    this.client = new HyperspaceClient()
    await this.client.ready()
  }

 }

 /**
 * clean and close hyperspace connection
 * @method clearcloseHyperspace
 *
 */
HyperspaceWorker.prototype.clearcloseHyperspace = async function () {
  await this.client.close()
  if (this.server) {
    console.log('Shutting down Hyperspace, this may take a few seconds...')
    await this.server.stop()
  }
}

/**
 * start Hyperdrive
 * @method setupHyperdrive
 *
 */
 HyperspaceWorker.prototype.setupHyperdrive = async function () {
  // Create a Hyperdrive
  const corestore = new Corestore('storage')
  this.drive = new Hyperdrive(corestore, null)
  console.log('after hyperdirve')
  await this.drive.ready()
  console.log('New drive created, key:')
  console.log('  ', this.drive.key.toString('hex'))
 }

/**
 * setup hypercore protocol
 * @method startHyperbee
 *
 */
 HyperspaceWorker.prototype.setupHyperbee = async function () {
   
  const store = this.client.corestore('peerspace-hyperbee')

  const core = store.get({ name: 'publiclibrary' })
  this.dbPublicLibrary = new Hyperbee(core, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  
  await this.dbPublicLibrary.ready()
  console.log(this.dbPublicLibrary._feed)

  const core2 = store.get({ name: 'peerlibrary' })
  this.dbPeerLibrary = new Hyperbee(core2, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  
  await this.dbPeerLibrary.ready()
  console.log(this.dbPeerLibrary._feed)

  const core6 = store.get({ name: 'peers' })
  this.dbPeers = new Hyperbee(core6, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  
  await this.dbPeers.ready()
  console.log(this.dbPeers._feed)

  const core3 = store.get({ name: 'bentospaces' })
  this.dbBentospaces = new Hyperbee(core3, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  
  await this.dbBentospaces.ready()
  console.log(this.dbBentospaces._feed)

  const core4 = store.get({ name: 'hopresults' })
  this.dbHOPresults = new Hyperbee(core4, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  
  await this.dbHOPresults.ready()
  console.log(this.dbHOPresults._feed)

  const core5 = store.get({ name: 'kbledger' })
  this.dbKBledger = new Hyperbee(core5, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  
  await this.dbKBledger.ready()
  console.log(this.dbKBledger._feed)
}

/**
 * save pair in keystore db
 * @method saveHyperbeeDB
 *
 */
 HyperspaceWorker.prototype.savePeerLibrary = async function (dataPair) {

  // if you own the feed
  await this.dbPeerLibrary.put('key', 'value3')
  // await this.dbbee3.put('key', 'value3')
  // await this.dbbee3.put('key2', 'value3')
  // await this.dbbee3.put('some-key')
  console.log('save ref contract bee')
 }

 /**
 * save pair in keystore public network library
 * @method savePublicLibRefCont
 *
 */
  HyperspaceWorker.prototype.savePublicLibRefCont = async function (dataPair) {
  console.log('public lib ref cont save')
  console.log(dataPair)
  // if you own the feed
  await this.dbPublicLibrary.put(dataPair.hash, dataPair.contract)
  // need to return info.
}

/**
* save kbledger entry
* @method saveKBLentry
*
*/
HyperspaceWorker.prototype.saveKBLentry = async function (refContract) {
  await this.dbKBledger.put(refContract.hash, refContract.contract)
}

/**
* save HOPresults
* @method saveHOPresults
*
*/
HyperspaceWorker.prototype.saveHOPresults = async function (refContract) {
  await this.dbHOPresults.put(refContract.hash, refContract.contract)
}

 /**
 * get data for keystore db
 * @method getHyperbeeDB
 *
 */
  HyperspaceWorker.prototype.getHyperbeeDB = async function (refchash) {
  // if you want to query the feed
  const nodeData = await this.dbbee3.get(refchash) // null or { key, value }
  console.log(nodeData)
  console.log('retrieve key bee')
}

/**
* lookup specific result UUID
* @method peerResults
*
*/
HyperspaceWorker.prototype.peerResults = async function (dataPrint) {
  // console.log('peer store query')
  const nodeData = await this.dbHOPresults.get(dataPrint.resultuuid)
  return nodeData
}


/**
 * get stream data for keystore db
 * @method getStreamHyperbeeDB
 *
 */
 HyperspaceWorker.prototype.getStreamHyperbeeDB = async function () {
  // if you want to read a range
  let rs = this.dbbee.createReadStream({ gt: 'a', lt: 'd' }) // anything >a and <d

  let rs2 = this.dbbee.createReadStream({ gte: 'a', lte: 'd' }) // anything >=a and <=d

  for await (const { key, value } of rs) {
    console.log(`${key} -> ${value}`)
  }

}

/**
 * hyperdrive stream write
 * @method hyperdriveWritestream 
 *
 */
 HyperspaceWorker.prototype.hyperdriveWritestream = async function (fileData) {
  console.log('save file hyperdrive')
  // console.log(this.drive)
  let localthis = this
  const ws = this.drive.createWriteStream('/blob.txt')

  ws.write('Hello, ')
  ws.write('world!')
  ws.end()

  ws.on('close', function () {
    const rs = localthis.drive.createReadStream('/blob.txt')
    rs.pipe(process.stdout) // prints Hello, world!
  })
}

/**
 * navigate folders and files
 * @method hyperdriveFolderFiles 
 *
 */
 HyperspaceWorker.prototype.hyperdriveFolderFiles = async function (fileData) {
  // File writes
  let fileResponse = {}

  // file input management
  // protocol to save original file
  let newPathFile = await this.hyperdriveFilesave(fileData.data.type, fileData.data.name, fileData.data.path)
  console.log('newpath-hyperdrive')
  console.log(newPathFile)
  // extract out the headers name for columns
  let headerSet = this.fileUtility.extractCSVHeaderInfo(fileData)
  // let drivePath = fileData.data.type
  // hyperdrive 10 old
  // await this.drive.promises.mkdir(drivePath)
  // make a subfolder not sure for now
  // await this.drive.promises.mkdir('/stuff/things')
  //  csv to JSON convertion HOP protocol standard
  const parseData = await this.readCSVfile(newPathFile, headerSet)
  let jsonFiledata = this.fileUtility.convertJSON(fileData, headerSet, parseData, 'local', null)
  // save the json file
  let newPathFile2 = await this.hyperdriveFilesave(jsonFiledata.path, jsonFiledata.name, jsonFiledata.data)
  fileResponse.filename = newPathFile2
  fileResponse.header = headerSet
  fileResponse.data = jsonFiledata
  return fileResponse
}

/**
 * save to hyperdrive file
 * @method hyperdriveFilesave 
 *
 */
 HyperspaceWorker.prototype.hyperdriveFilesave = async function (path, name, data) {
  // File writes
  let hyperdrivePath = path + '/' + name
  console.log('path')
  console.log(hyperdrivePath)
  var dataUrl = data.split(",")[1]
  var buffer = Buffer.from(dataUrl, 'base64')
  fs.writeFileSync('data.csv', buffer)
  if (path === 'text/csv') {
    console.log('csv')
    await this.drive.put(hyperdrivePath, fs.readFileSync('data.csv', 'utf-8'))
    // hyperdrive 10 code
    // await this.drive.promises.writeFile(hyperdrivePath , data)
    // await this.drive.promises.writeFile('/stuff/file2.bin', Buffer.from([0,1,2,4]))
  } else if (path === 'json') {
    console.log('json file save start')
    await this.drive.put(hyperdrivePath, data)
  }

  return hyperdrivePath
}

/**
 * read file nav to folder
 * @method hyperdriveReadfile 
 *
 */
 HyperspaceWorker.prototype.hyperdriveReadfile = async function (path) {
  // File reads
  const entry = await drive.entry(path)
  console.log('read one entry')
  console.log(entry)
  // hyperdrive 10 code
  /* console.log('readdir(/)')
  console.log('  ', await this.drive.promises.readdir('/'))
  console.log('readFile(/file1.txt, utf8)')
  console.log('  ', await this.drive.promises.readFile('/file1.txt', 'utf8'))
  console.log('readFile(/stuff/file2.bin, hex)')
  console.log('  ', await this.drive.promises.readFile('/stuff/file2.bin', 'hex')) */
  return true
}

/**
*  taken in csv file and read per line
* @method readCSVfile
*
*/
HyperspaceWorker.prototype.readCSVfile = async function (fpath, headerSet) {
  console.log('path in stream csv')
  console.log(fpath)
  console.log(headerSet)
  // const rs2 = this.drive.createReadStream(fpath) // 'text/csv/testshed11530500.csv') // '/blob.txt')
  // rs2.pipe(process.stdout) // prints file content
  const rs = this.drive.createReadStream(fpath) // 'text/csv/testshed11530500.csv') // '/blob.txt')
 
  return new Promise((resolve, reject) => {
    const results = []
    //this.drive.createReadStream(fpath)
      rs.pipe(csv({ headers: headerSet.headerset, separator: headerSet.delimiter, skipLines: headerSet.dataline }))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results)
      })
  })
}

/**
 * replicate a hyperdrive
 * @method hyperdriveReplicate 
 *
*/
HyperspaceWorker.prototype.hyperdriveReplicate = async function (type) {

  // Swarm on the network
  console.log('replicate on network started')
  await this.client.replicate(this.drive)
  await new Promise(r => setTimeout(r, 3e3)) // just a few seconds
  await this.client.network.configure(this.drive, {announce: false, lookup: false})
}

/**
 * clean the hyperspace protocol
 * @method cleanHyperspace
 *
*/
HyperspaceWorker.prototype.cleanHyperspace = async function () {
  await cleanup()
}

export default HyperspaceWorker    