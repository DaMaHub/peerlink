import {
  Client as HyperspaceClient,
  Server as HyperspaceServer
} from 'hyperspace'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import Hyperbee from 'hyperbee'
import Fileparser from './fileParser.js'
import os from 'os'
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
  this.dbPublicLibraryTemp = {}
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
  const corestore = new Corestore(os.homedir() + '/.hyperspace/storagedrive')
  this.drive = new Hyperdrive(corestore, null)
  await this.drive.ready()
  console.log('New drive created, key:')
  console.log('  ', this.drive.key.toString('hex'))
  return this.drive.key.toString('hex')
 }

/**
 * setup hypercore protocol
 * @method startHyperbee
 *
 */
 HyperspaceWorker.prototype.setupHyperbee = async function () {
  let beePubkeys = []
  const store = this.client.corestore('peerspace-hyperbee')

  const core = store.get({ name: 'publiclibrary' })
  this.dbPublicLibrary = new Hyperbee(core, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  await this.dbPublicLibrary.ready()
  beePubkeys.push({'pubilclibrary': this.dbPublicLibrary._feed.key.toString('hex')})
  // console.log(this.dbPublicLibrary._feed)
  this.client.replicate(this.dbPublicLibrary.feed)

  const core2 = store.get({ name: 'peerlibrary' })
  this.dbPeerLibrary = new Hyperbee(core2, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  await this.dbPeerLibrary.ready()
  beePubkeys.push({'peerlibrary': this.dbPeerLibrary._feed.key.toString('hex')})

  const core6 = store.get({ name: 'peers' })
  this.dbPeers = new Hyperbee(core6, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  await this.dbPeers.ready()
  beePubkeys.push({'peers': this.dbPeers._feed.key.toString('hex')})

  const core3 = store.get({ name: 'bentospaces' })
  this.dbBentospaces = new Hyperbee(core3, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  await this.dbBentospaces.ready()
  beePubkeys.push({'bentospaces': this.dbBentospaces._feed.key.toString('hex')})

  const core4 = store.get({ name: 'hopresults' })
  this.dbHOPresults = new Hyperbee(core4, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  await this.dbHOPresults.ready()
  beePubkeys.push({'hopresults': this.dbHOPresults._feed.key.toString('hex')})

  const core5 = store.get({ name: 'kbledger' })
  this.dbKBledger = new Hyperbee(core5, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  await this.dbKBledger.ready()
  beePubkeys.push({'kbledger': this.dbKBledger._feed.key.toString('hex')})

  return beePubkeys
}

 /**
 * save pair in keystore public network library
 * @method savePubliclibrary
 *
 */
  HyperspaceWorker.prototype.savePubliclibrary = async function (refContract) {
    await this.dbPublicLibrary.put(refContract.hash, refContract.contract)
    let returnMessage = {}
    returnMessage.stored = true
    returnMessage.type = refContract.reftype
    returnMessage.key = refContract.hash
    returnMessage.contract = refContract.contract
    return returnMessage
  }
  

/**
 * save pair in keystore db
 * @method savePeerLibrary
 *
 */
 HyperspaceWorker.prototype.savePeerLibrary = async function (refContract) {

  await this.dbPeerLibrary.put(refContract.hash, refContract.contract)
  let returnMessage = {}
  returnMessage.stored = true
  returnMessage.type = refContract.reftype
  returnMessage.key = refContract.hash
  returnMessage.contract = refContract.contract
  return returnMessage
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
  await this.dbHOPresults.put(refContract.hash, refContract.data)
}

/**
* save space layout of bentobox
* @method saveBentospace
*
*/
HyperspaceWorker.prototype.saveBentospace = async function (spaceContract) {
  let key = 'startbentospaces'
  await this.dbBentospaces.put(key, spaceContract)
}
 
 /**
 * get data for keystore db
 * @method getHyperbeeDB
 *
 */
HyperspaceWorker.prototype.getHyperbeeDB = async function (refchash) {
  // if you want to query the feed
  const nodeData = await this.dbbee3.get(refchash)

}

/**
* lookup peer bentospace layout default
* @method getBentospace
*
*/
HyperspaceWorker.prototype.getBentospace = async function () {
  let key = 'startbentospaces'
  const nodeData = await this.dbBentospaces.get(key)
  return nodeData
}

/**
* lookup specific result UUID
* @method getPublicLibrary
*
*/
HyperspaceWorker.prototype.getPublicLibrary = async function (contractID) {
  const nodeData = await this.dbPublicLibrary.get(contractID)
  return nodeData
}

/**
* lookup range query of db
* @method getPublicLibraryRange
*
*/
HyperspaceWorker.prototype.getPublicLibraryRange = async function (dataPrint) {
  const nodeData = this.dbPublicLibrary.createReadStream() // { gt: 'a', lt: 'z' }) // anything >a and <z
  let contractData = []
  for await (const { key, value } of nodeData) {
    contractData.push({ key, value })
  }
  return contractData
}

/**
* return the last entry into db
* @method getPublicLibraryLast
*
*/
HyperspaceWorker.prototype.getPublicLibraryLast = async function (dataPrint) {
  const nodeData = this.dbPublicLibrary.createHistoryStream({ reverse: true, limit: 1 })
  return nodeData
}

/**
* lookup al peer library entries
* @method getPeerLibrary
*
*/
HyperspaceWorker.prototype.getPeerLibrary = async function (contractID) {
  const nodeData = await this.dbPeerLibrary.get(contractID)
  return nodeData
}

/**
* lookup al peer library range
* @method getPeerLibraryRanage
*
*/
HyperspaceWorker.prototype.getPeerLibraryRange = async function () {
  const nodeData = await this.dbPeerLibrary.createReadStream() // { gt: 'a', lt: 'z' })
  let contractData = []
  for await (const { key, value } of nodeData) {
    contractData.push({ key, value })
  }
  return contractData
}

/**
* lookup al peer library Last entry
* @method getPeerLibraryLast
*
*/
HyperspaceWorker.prototype.getPeerLibraryLast = async function () {
  const nodeData = await this.dbPeerLibrary.createHistoryStream({ reverse: true, limit: 1 })
  return nodeData
}

/**
* lookup specific result UUID
* @method peerResults
*
*/
HyperspaceWorker.prototype.peerResults = async function (dataPrint) {
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
 * delete nxp ref contract from peer library
 * @method deleteRefcontPeerlibrary
 *
 */
 HyperspaceWorker.prototype.deleteRefcontPeerlibrary = async function (nxpID) {
  console.log('delecotnra id')
  console.log(nxpID)
  let deleteInfo = {}
  let deleteStatus = await this.dbPeerLibrary.del(nxpID)
  deleteInfo.success = deleteStatus
  deleteInfo.nxp = nxpID
  return deleteInfo
 }

/**
 * delete nxp ref contract from peer library
 * @method deleteBentospace
 *
 */
 HyperspaceWorker.prototype.deleteBentospace = async function (nxpID) {
  let key = 'startbentospaces'
  const deleteStatus = await this.dbBentospaces.del(key)
  return deleteStatus
 }

/**
 * repicate the publiclibrary peer to peer
 * @method replicatePubliclibrary
 *
 */
 HyperspaceWorker.prototype.replicatePubliclibrary = async function (key) {
  console.log('key to repilicate')
  console.log(key)
  // key = '3ec0f3b78a0cfe574c4be89b1d703a65f018c0b73ad77e52ac65645d8f51676a'
  const store = this.client.corestore('peerspace-hyperbeetemp')
  const core = store.get(key)
  this.dbPublicLibraryTemp = new Hyperbee(core, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'json' // same options as above
  })
  await this.client.replicate(this.dbPublicLibraryTemp.feed) // fetch from the network
  await this.dbPublicLibraryTemp.ready()
  // console.log('value for key')
  // console.log(await this.dbPublicLibraryTemp.get('key'))
  return { replicate: true }
 }

 /**
* get the network library reference contracts - all for now replicate source
* @method getReplicatePublicLibrary
*
*/
HyperspaceWorker.prototype.getReplicatePublicLibrary = async function (nxp) {
  console.log('temp public library get info from peer replicate')
  console.log(nxp)
  // const peerRepData = await this.dbPublicLibraryTemp.get()
  const peerRepData = await this.dbPublicLibraryTemp.createReadStream()
  let contractData = []
  for await (const { key, value } of peerRepData) {
    contractData.push({ key, value })
  }
  return contractData
}


/**
* take nxp id from temporary pubic network library and add to peers public library
* @method publicLibraryAddentry
*
*/
HyperspaceWorker.prototype.publicLibraryAddentry = async function (nxp) {
  console.log('add entry from nl2')
  console.log(nxp)
  const localthis = this
  const refContract = await this.dbPublicLibraryTemp.get(nxp.nxpID)
    // need to look up individual module contracts and copy them across
  for (let mod of refContract.value.modules) {
    // more hypertie get queries and saving
    const modRefContract = await localthis.dbPublicLibraryTemp.get(mod)
      if (modRefContract.value.info.moduleinfo.name === 'visualise') {
        // what are the datatypes?
        let datatypeList = []
        datatypeList.push(modRefContract.value.info.option.settings.xaxis)
        datatypeList = [...datatypeList, ...modRefContract.value.info.option.settings.yaxis]
        for (let dtref of datatypeList) {
          if (dtref !== null) {
            const tempRC = await localthis.dbPublicLibraryTemp.get(dtref)
            const saveReprc = await localthis.dbPublicLibrary.put(tempRC.key, tempRC.value)
            // return saveReprc
          }
        }
      }
      // need to get the underlying ref contract for module type e.g data, compute, vis
      if (modRefContract.value.info.refcont) {
        const tempRC = await localthis.dbPublicLibraryTemp.get(modRefContract.value.info.refcont)
        const saveRC = await  localthis.dbPublicLibrary.put(tempRC.key, tempRC.value)
        // return saveRC
      }
    const saveRClib = await localthis.dbPublicLibrary.put(modRefContract.key, modRefContract.value)
    // return saveRClib
    const savePublibrc = await localthis.dbPublicLibrary.put(refContract.key, refContract.value)
    // return savePublibrc
  }
}

/**
 * hyperdrive stream write
 * @method hyperdriveWritestream 
 *
 */
 HyperspaceWorker.prototype.hyperdriveWritestream = async function (fileData) {
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
  var dataUrl = data.split(",")[1]
  var buffer = Buffer.from(dataUrl, 'base64')
  fs.writeFileSync('data.csv', buffer)
  if (path === 'text/csv') {
    await this.drive.put(hyperdrivePath, fs.readFileSync('data.csv', 'utf-8'))
    // now remove the temp file for converstion
    fs.unlink('data.csv', (err => {
      if (err) console.log(err);
      else {
        console.log('file deleted csv');
      }
    }))
  } else if (path === 'json') {
    await this.drive.put(hyperdrivePath, data)
  } else if (path === 'sqlite') {
    var dataUrl = data.split(",")[1]
    var buffer = Buffer.from(dataUrl, 'base64')
    fs.writeFileSync('tempsql.db', buffer)
    await this.drive.put(hyperdrivePath, fs.readFileSync('tempsql.db'))
    fs.unlink('tempsql.db', (err => {
      if (err) console.log(err);
      else {
        console.log('file deleted temp sqlite');
      }
    }))
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
  const entry = await this.drive.get(path)
  entry.on('data',  function(chunk) {
  })
  return true
}

/**
 * rebuidl file and give directory location
 * @method hyperdriveLocalfile
 *
 */
 HyperspaceWorker.prototype.hyperdriveLocalfile = async function (path) {
  // File reads to buffer and recreate file
  // const bufFromGet2 = await this.drive.get(path)
  const { value: entry } = await this.drive.entry(path)
  const blobs = await this.drive.getBlobs()
  const bufFromEntry = await blobs.get(entry.blob)

  let localFile = 'localdb'
  // fs.writeFileSync(localFile, bufFromGet2)
  fs.writeFileSync(localFile, bufFromEntry)
  return localFile
 }

/**
*  taken in csv file and read per line
* @method readCSVfile
*
*/
HyperspaceWorker.prototype.readCSVfile = async function (fpath, headerSet) {
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