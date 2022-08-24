import {
  Client as HyperspaceClient,
  Server as HyperspaceServer
} from 'hyperspace'
import Hyperdrive from 'hyperdrive'
import Hyperbee from 'hyperbee'
import util from 'util'
import events from 'events'

var PeerStoreWorker = function () {
  this.client = {}
  this.server = {}
  this.drive = {}
  this.store = {}
  this.core = {}
  this.dbbee = {}
  console.log('{in-hyperspace}')
}

/**
 * inherits core emitter class within this class
 * @method inherits
 */
util.inherits(PeerStoreWorker, events.EventEmitter)

/**
 * setup hypercore protocol
 * @method startHyperspace
 *
 */
PeerStoreWorker.prototype.startHyperspace = async function () {
  await this.setupHyperspace()
  // console.log('Hyperspace daemon connected, status:')
  // console.log(await this.client.status())

}

/**
 * setup hypercore protocol
 * @method startHyperspace
 *
 */
 PeerStoreWorker.prototype.setupHyperspace = async function () {
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
PeerStoreWorker.prototype.clearcloseHyperspace = async function () {
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
 PeerStoreWorker.prototype.setupHyperdrive = async function () {
  // Create a Hyperdrive
  this.drive = new Hyperdrive(this.client.corestore(), null)
  await this.drive.promises.ready()
  console.log('New drive created, key:')
  console.log('  ', this.drive.key.toString('hex'))
 }

/**
 * setup hypercore protocol
 * @method startHyperbee
 *
 */
 PeerStoreWorker.prototype.setupHyperbee = async function () {
   
  const store = this.client.corestore('hyperbee-learn2')
  const core = store.get({ name: 'hop-2' })
  
  this.dbbee= new Hyperbee(core, {
    keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
    valueEncoding: 'binary' // same options as above
  })
  
  await this.dbbee.ready()
  console.log(this.dbbee._feed)
}

/**
 * save pair in keystore db
 * @method saveHyperbeeDB
 *
 */
 PeerStoreWorker.prototype.saveHyperbeeDB = async function () {

  // if you own the feed
  await this.dbbee.put('key', 'value')
  await this.dbbee.put('key2', 'value2')
  await this.dbbee.put('some-key')
  console.log('save over bee')
 }

 /**
 * get data for keystore db
 * @method getHyperbeeDB
 *
 */
PeerStoreWorker.prototype.getHyperbeeDB = async function () {
  // if you want to query the feed
  const nodeData = await this.dbbee.get('key') // null or { key, value }
  console.log(nodeData)
  console.log('retrieve key bee')
}

/**
 * get stream data for keystore db
 * @method getStreamHyperbeeDB
 *
 */
PeerStoreWorker.prototype.getStreamHyperbeeDB = async function () {
  // if you want to read a range
  let rs = this.dbbee.createReadStream({ gt: 'a', lt: 'd' }) // anything >a and <d

  let rs2 = this.dbbee.createReadStream({ gte: 'a', lte: 'd' }) // anything >=a and <=d

  for await (const { key, value } of rs) {
    console.log(`${key} -> ${value}`)
  }

}


/**
 * navigate folders and files
 * @method hyperdriveFolderFiles 
 *
 */
PeerStoreWorker.prototype.hyperdriveFolderFiles = async function () {
  // File writes
  await this.drive.promises.mkdir('/stuff')
  await this.drive.promises.mkdir('/stuff/things')
  await this.drive.promises.writeFile('/file1.txt', 'Hello world!')
  await this.drive.promises.writeFile('/stuff/file2.bin', Buffer.from([0,1,2,4]))
}

/**
 * read file nav to folder
 * @method hyperdriveReadfile 
 *
 */
 PeerStoreWorker.prototype.hyperdriveReadfile = async function () {
  // File reads
  console.log('readdir(/)')
  console.log('  ', await this.drive.promises.readdir('/'))
  console.log('readFile(/file1.txt, utf8)')
  console.log('  ', await this.drive.promises.readFile('/file1.txt', 'utf8'))
  console.log('readFile(/stuff/file2.bin, hex)')
  console.log('  ', await this.drive.promises.readFile('/stuff/file2.bin', 'hex'))
}

/**
 * replicate a hyperdrive
 * @method hyperdriveReplicate 
 *
*/
PeerStoreWorker.prototype.hyperdriveReplicate = async function () {

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
PeerStoreWorker.prototype.cleanHyperspace = async function () {
  await cleanup()
}

export default PeerStoreWorker    