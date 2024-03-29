'use strict'
/**
*  PeerStoreWorker
*
*
* @class PeerStoreWorker
* @package    safeFlow
* @copyright  Copyright (c) 2019 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import hypercore from 'hypercore'
import hypertrie from 'hypertrie'
import hyperswarm from 'hyperswarm'
import fs from 'fs'
import os from 'os'
import util from 'util'
import events from 'events'
import pump from 'pump'

var PeerStoreWorker = function (path) {
  events.EventEmitter.call(this)
  this.storepath = path
  this.datastorePeerlibrary = {}
  this.datastoreNL = {}
  this.datastoreKBL = {}
  // this.dataswarm = new hyperswarm()
  this.listdata = []
  this.awaitQuery = []
  this.queryCallback = null
  this.queryCallbackSet = false
  // this.listRatequery()
}

/**
* inherits core emitter class within this class
* @method inherits
*/
util.inherits(PeerStoreWorker, events.EventEmitter)

/**
* setup datastores
* @method setupDatastores
*
*/
PeerStoreWorker.prototype.setupDatastores = function () {
  const localthis = this
  if (fs.existsSync(os.homedir() + this.storepath)) {
    // Do something
    // setup datastores
    this.activateDatastores()
  } else {
    fs.mkdir(os.homedir() + this.storepath, function(err) {
      if (err) {
        console.log(err)
      } else {
        console.log("New directory successfully created.")
        // setup datastores
        localthis.activateDatastores()
      }
    })
  }
}

/**
* make live datastores
* @method activateDatastores
*
*/
PeerStoreWorker.prototype.activateDatastores = function () {
  /* this.feed = hypercore(os.homedir() + this.storepath + ''/peerlog', {
    valueEncoding: 'json'
  }) */
  // peer warm cold connections
  this.datastorePeers = hypertrie(os.homedir() + this.storepath + '/peernetwork.db', {valueEncoding: 'json'})
  // peer warm cold connections
  this.datastoreLifeboards = hypertrie(os.homedir() + this.storepath + '/peerlifeboards.db', {valueEncoding: 'json'})
  // peer library of joined experiments
  this.datastoreBentospaces = hypertrie(os.homedir() + this.storepath + '/peerbentospaces.db', {valueEncoding: 'json'})
  // peer library of joined experiments
  this.datastorePeerlibrary = hypertrie(os.homedir() + this.storepath + '/peerlibrary.db', {valueEncoding: 'json'})
  // network library public
  this.datastoreNL = hypertrie(os.homedir() + this.storepath + '/librarynetwork.db', {valueEncoding: 'json'})
  // results ledger
  this.datastoreResults = hypertrie(os.homedir() + this.storepath + '/resultspeer.db', {valueEncoding: 'json'})
  // knowledge bundle ledger
  this.datastoreKBL = hypertrie(os.homedir() + this.storepath + '/kblpeer.db', {valueEncoding: 'json'})

  // open public library for replication
  this.publicLibraryReplicate()
}

/**
* return public keys for key managment
* @method keyManagement
*
*/
PeerStoreWorker.prototype.keyManagement = function (callback) {
  let pubkeys = {}
  this.datastorePeers.ready(() => {
    pubkeys.peernetwork = this.datastorePeers.key.toString('hex')
    callback(pubkeys)
  })
  let pubkeys2 = {}
  this.datastorePeerlibrary.ready(() => {
    pubkeys2.peerlibrary = this.datastorePeerlibrary.key.toString('hex')
    callback(pubkeys2)
  })
  let pubkeys3 = {}
  this.datastoreNL.ready(() => {
    pubkeys3.librarynetwork = this.datastoreNL.key.toString('hex')
    callback(pubkeys3)
  })
  let pubkeys3b = {}
  this.datastoreNL.ready(() => {
    pubkeys3b.librarynetworkdiscovery = this.datastoreNL.discoveryKey.toString('hex')
    callback(pubkeys3b)
  })
  let pubkeys4 = {}
  this.datastoreResults.ready(() => {
    pubkeys4.resultspeer = this.datastoreResults.key.toString('hex')
    callback(pubkeys4)
  })
  let pubkeys5 = {}
  this.datastoreKBL.ready(() => {
    pubkeys5.kblpeer = this.datastoreKBL.key.toString('hex')
    callback(pubkeys5)
  })
  let pubkeys6 = {}
  this.datastoreLifeboards.ready(() => {
    pubkeys6.lifeboards = this.datastoreLifeboards.key.toString('hex')
    callback(pubkeys6)
  })
}

/**
* return list lifeboards
* @method listLifeboards
*
*/
PeerStoreWorker.prototype.listLifeboards = function (callback, callbacklibrary) {
  this.datastoreLifeboards.list( { ifAvailable: true }, (err, data) => {
    // sync with the main peer in the warm list
    // check the public network library and check for updates
    // let testKey = 'a373cba8dd96e8d64856925faf1ca85f9e755441ded7a866978c18320437c72e' // data[0.value.publickey]
    // this.replicatePublicLibrary(testKey, callbacklibrary)
    callback(data)
  })
}

/**
* return confirmation of new Lifeboard saved
* @method addLifeboard
*
*/
PeerStoreWorker.prototype.addLifeboard = function (newLifeboard, callback) {
  let localthis = this
  this.datastoreLifeboards.put(newLifeboard.publickey, newLifeboard, function () {
    localthis.datastorePeers.get(newLifeboard.publickey, (err, data) => {
        callback(data)
      })
  })
}

/**
* return list bentospaces info
* @method listBentospaces
*
*/
PeerStoreWorker.prototype.listBentospaces = function (callback) {
  this.datastoreBentospaces.list( { ifAvailable: true }, (err, data) => {
    callback(data)
  })
}

/**
* add new or update bentospaces info
* @method addBentospaces
*
*/
PeerStoreWorker.prototype.addBentospaces = function (newBentoSpace, callback) {
  let key = 'startbentospaces'
  this.datastoreBentospaces.put(key, newBentoSpace, function (err, data) {
    callback(data)
  })
}


/**
* return list of warm peers
* @method listWarmPeers
*
*/
PeerStoreWorker.prototype.listWarmPeers = function (callback, callbacklibrary) {
  this.datastorePeers.list( { ifAvailable: true }, (err, data) => {
    // sync with the main peer in the warm list
    // check the public network library and check for updates
    // let testKey = 'a373cba8dd96e8d64856925faf1ca85f9e755441ded7a866978c18320437c72e' // data[0.value.publickey]
    // this.replicatePublicLibrary(testKey, callbacklibrary)
    callback(data)
  })
}

/**
* return confirmation peer added and saved
* @method addPeer
*
*/
PeerStoreWorker.prototype.addPeer = function (newPeer, callback) {
  let localthis = this
  this.datastorePeers.put(newPeer.publickey, newPeer, function () {
    localthis.datastorePeers.get(newPeer.publickey, (err, data) => {
        callback(data)
      })
  })
}

/**
* return library public key and active swarm open
* @method privatePeerLibraryReplicate
*
*/
PeerStoreWorker.prototype.privatePeerLibraryReplicate = function (pk, callback) {
  const localthis = this
  let liveSwarm = new hyperswarm()
  let pubkey = ''
  this.datastorePeerlibrary.ready(() => {
    pubkey = this.datastorePeerlibrary.key.toString('hex')
    // join swarm Network
    liveSwarm.join(this.datastorePeerlibrary.key, {
      lookup: true, // find & connect to peers
      announce: true // optional- announce yourself as a connection target
    })
    // make NetworkLibrary datastore open for another peer to replicate
    liveSwarm.on('connection', function (socket, details) {
      // `details` is a simple object that describes the peer we connected to
      console.log('swarm connect peer1')
      pump(socket, localthis.datastorePeerlibrary.replicate(true, { live: true }), socket)
    })
    callback(pubkey)
  })
}

/**
* open library datastore for replication from peers with its public key
* @method publicLibraryReplicate
*
*/
PeerStoreWorker.prototype.publicLibraryReplicate = function () {
  console.log('publiclibrary open for replication-org')
  // hardwired to public network library for now
  const localthis = this
  let liveSwarm = new hyperswarm()
  let pubkey = ''
  this.datastoreNL.ready(() => {
    pubkey = this.datastoreNL.key.toString('hex')
    // join swarm Network
    liveSwarm.join(this.datastoreNL.key, {
      lookup: true, // find & connect to peers
      announce: true // optional- announce yourself as a connection target
    })
    let connectCount = 0
    // make NetworkLibrary datastore open for another peer to replicate
    liveSwarm.on('connection', function (socket, details) {
      connectCount++
      // console.log(connectCount)
      // `details` is a simple object that describes the peer we connected to
      // console.log('swarm connect peer primary')
      pump(socket, localthis.datastoreNL.replicate(true, { live: true }), socket)
    })
  })
}

/**
* receive another publick library ref contract datastore
* @method publicLibraryReceive
*
*/
PeerStoreWorker.prototype.publicLibraryReceive = function (key, callback) {
  // replicate
  const localthis = this
  let liveSwarm = new hyperswarm()
  var connectCount = 0
  let rpeer1Key = Buffer.from(key, "hex")
  // has the peers key and datastore been setup already?
  if (this.datastoreNL2 === undefined) {
    console.log('nol setup??')
    localthis.datastoreNL2 = hypertrie(os.homedir() + this.storepath + '/librarynetwork2.db', rpeer1Key, {valueEncoding: 'json'})
    liveSwarm.join(rpeer1Key, {
      lookup: true, // find & connect to peers
      announce: true // optional- announce yourself as a connection target
    })
    this.datastoreNL2.ready(() => {
      liveSwarm.on('connection', function (socket, details) {
        console.log('RECEIVEnl2 swarm connect peer')
        // connectCount++
        // console.log(connectCount)
        pump(socket, localthis.datastoreNL2.replicate(false, { live: true }), socket)
        console.log('after replication')
        let replicateMessage = {}
        replicateMessage.store = 'publiclibrary'
        replicateMessage.replicate = true
        callback(replicateMessage)
        // localthis.datastoreNL2.list( { ifAvailable: true }, callback)
        // keep checking for new updates to network library (need to filter when bigger network)
        /* function updatePublicLibrary() {
          pump(socket, localthis.datastoreNL2.replicate(false, { live: true }), socket)
          localthis.datastoreNL2.list( { ifAvailable: true }, callback)
        }
        // setInterval(updatePublicLibrary, 2000) */
      })
    })
  }
}

/**
* take nxp id from temporary pubic network library and add to peers public library
* @method publicLibraryAddentry
*
*/
PeerStoreWorker.prototype.publicLibraryAddentry = function (nxp, callback) {
  console.log('add entry from nl2')
  const localthis = this
  // this.datastoreNL2.get(nxp.nxpID, console.log)
  this.datastoreNL2.get(nxp.nxpID, function (err, entry) {
    // need to look up individual module contracts and copy them across
    for (let mod of entry.value.modules) {
      // more hypertie get queries and saving
      localthis.datastoreNL2.get(mod, function (err, entry) {
        if (entry.value.info.moduleinfo.name === 'visualise') {
          // what are the datatypes?
          let datatypeList = []
          datatypeList.push(entry.value.info.option.settings.xaxis)
          datatypeList = [...datatypeList, ...entry.value.info.option.settings.yaxis]
          for (let dtref of datatypeList) {
            localthis.datastoreNL2.get(dtref, function (err, entry) {
              localthis.datastoreNL.put(entry.key, entry.value, (err, data) => {
                callback(data)
              })
            })
          }
        }
        // need to get the underlying ref contract for module type e.g data, compute, vis
        if (entry.value.info.refcont) {
          localthis.datastoreNL2.get(entry.value.info.refcont, function (err, entry) {
            localthis.datastoreNL.put(entry.key, entry.value, (err, data) => {
              callback(data)
            })
          })
        }
        localthis.datastoreNL.put(entry.key, entry.value, (err, data) => {
          callback(data)
        })
      })
    }
    localthis.datastoreNL.put(entry.key, entry.value, (err, data) => {
      callback(data)
    })
  })
}

/**
* remove the temp network library of peer synced
* @method publicLibraryRemoveTempNL
*
*/
PeerStoreWorker.prototype.publicLibraryRemoveTempNL = function () {
  this.datastoreNL2 = {}
  // remove the hypertrie db
  let tempLibraryfolder = os.homedir() + this.storepath + '/librarynetwork2.db'
  fs.rmdir(tempLibraryfolder, { recursive: true }, (err) => {
      if (err) {
          throw err
      }
      console.log(`${tempLibraryfolder} is deleted!`);
  })
}

/**
* replicate network library from peer with own local public library
* @method localNetworkLibrarySync
*
*/
PeerStoreWorker.prototype.localNetworkLibrarySync = function (nlr, nw, opts) {
  const stream = nlr.replicate(true, opts)
  return stream.pipe(nw.replicate(false, opts)).pipe(stream)
}

/**
* get the network library reference contracts - all for now
* @method libraryGETRefContracts
*
*/
PeerStoreWorker.prototype.libraryGETRefContracts = function (getType, callback) {
  let databackP = this.datastoreNL.list( { ifAvailable: true }, callback)
  return true
}

/**
* get the network library reference contracts - all for now
* @method libraryGETRefContracts
*
*/
PeerStoreWorker.prototype.libraryGETReplicateLibrary = function (getType, callback) {
  console.log('using NL2')
  // console.log(this.datastoreNL2)
  if (this.datastoreNL2) {
    this.datastoreNL2.list( { ifAvailable: true }, callback)
    return true
  } else {
    return false
  }
}

/**
* peers lifeboard start settings
* @method peerGETLifeboards
*
*/
PeerStoreWorker.prototype.peerGETLifeboards = function (getType, callback) {
  // read
  let databack = this.datastoreLifeboards.list( { ifAvailable: true }, callback)
  return true
}

/**
* get Peer network library
* @method peerKBLstart
*
*/
PeerStoreWorker.prototype.peerGETRefContracts = function (getType, callback) {
  // read
  let databack = this.datastorePeerlibrary.list( { ifAvailable: true }, callback)
  return true
}

/**
* remove NXP ref contract from peer library
* @method peerREMOVERefContracts
*
*/
PeerStoreWorker.prototype.peerREMOVERefContracts = function (refcontid, callback) {
  // read
  let databack = this.datastorePeerlibrary.del(refcontid , callback)
  return true
}

/**
* lookup specific lifebaord reference contract
* @method getLifeboardContract
*
*/
PeerStoreWorker.prototype.getLifeboardContract = function (getType, refcont, callback) {
  // read
  let databack = this.datastoreLifeboards.list( { ifAvailable: true }, callback)
  return true
}

/**
* lookup specific reference contract
* @method getRefContract
*
*/
PeerStoreWorker.prototype.getRefContract = function (getType, refcont, callback) {
  // read
  let databack = this.datastoreNL.list( { ifAvailable: true }, callback)
  return true
}

/**
* keep checking if any results to rate limit
* @method listRatequery
*
*/
PeerStoreWorker.prototype.listRatequery = function () {
  console.log('list start rate')
}

/**
* lookup specific result UUID
* @method peerStoreCheckResults
*
*/
PeerStoreWorker.prototype.peerStoreCheckResults = async function (dataPrint, callback) {
  // console.log('peer store query')

  this.datastoreResults.get(dataPrint.resultuuid, function (err, node) {
    callback(dataPrint, err, node)
  })
  return true
}

/**
* rate limit the query speed to personal datastore
* @method queryLimiter
*
*/
PeerStoreWorker.prototype.queryLimiter = function (callback, index, limit, count) {
  function printEnd() {
    console.log('end')
  }

  if (index < count){
    setTimeout(()=>{
      this.datastoreResults.get(this.awaitQuery[index].resultuuid, function (err, node) {
        callback(this.awaitQuery[index].resultuuid, err, node)
      })
      index ++
      // remove element from array list?
      this.queryLimiter(callback, index, limit, count)
    }, limit, index)
  } else {
    printEnd()
  }
}

/**
* save new Reference Contract Lifeboard
* @method lifeboardStoreRefContract
*
*/
PeerStoreWorker.prototype.lifeboardStoreRefContract = function (refContract) {
  // save
  const localthis = this
  this.datastoreLifeboards.put(refContract.hash, refContract.contract, function () {
    // localthis.datastoreLifeboards.get(refContract.hash, console.log)
  })
  // this should be done via callback TODO
  let returnMessage = {}
  returnMessage.stored = true
  returnMessage.type = refContract.reftype
  returnMessage.key = refContract.hash
  returnMessage.contract = refContract.contract
  return returnMessage
}

/**
* save new Reference Contract network library
* @method libraryStoreRefContract
*
*/
PeerStoreWorker.prototype.libraryStoreRefContract = function (refContract) {
  // save
  const localthis = this
  this.datastoreNL.put(refContract.hash, refContract.contract, function () {
    // console.log('saved hypertrie OK')
    // localthis.datastoreNL.get(refContract.hash, console.log)
  })
  let returnMessage = {}
  returnMessage.stored = true
  returnMessage.type = refContract.reftype
  returnMessage.key = refContract.hash
  returnMessage.contract = refContract.contract
  return returnMessage
}

/**
* save new Reference Contract
* @method peerStoreRefContract
*
*/
PeerStoreWorker.prototype.peerStoreRefContract = function (refContract) {
  // save
  const localthis = this
  this.datastorePeerlibrary.put(refContract.hash, refContract.contract, function () {
    // console.log('saved hypertrie OK')
    // localthis.datastorePeerlibrary.get(refContract.hash, console.log)
  })
  let returnMessage = {}
  returnMessage.stored = true
  returnMessage.type = refContract.reftype
  returnMessage.key = refContract.hash
  returnMessage.contract = refContract.contract
  return returnMessage
}

/**
* save results from ECS
* @method peerStoreResults
*
*/
PeerStoreWorker.prototype.peerStoreResults = function (refContract) {
  // save
  const localthis = this
  this.datastoreResults.put(refContract.hash, refContract.data, function () {
    // console.log('saved hypertrie OK')
    // localthis.datastoreResults.get(refContract.hash, console.log)
  })
  let returnMessage = {}
  returnMessage.stored = true
  returnMessage.type = refContract.reftype
  returnMessage.key = refContract.hash
  returnMessage.contract = refContract.contract
  return returnMessage
}

/**
* save kbledger entry
* @method peerKBLentry
*
*/
PeerStoreWorker.prototype.peerKBLentry = function (refContract) {
  // save
  const localthis = this
  this.datastoreKBL.put(refContract.hash, refContract.data, function () {
    // console.log('saved hypertrie OK')
    // localthis.datastoreKBL.get(refContract.hash, console.log)
  })
  let returnMessage = {}
  returnMessage.stored = true
  returnMessage.type = refContract.reftype
  returnMessage.key = refContract.hash
  returnMessage.contract = refContract.contract
  return returnMessage
}

export default PeerStoreWorker
