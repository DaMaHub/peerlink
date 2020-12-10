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

var PeerStoreWorker = function () {
  events.EventEmitter.call(this)
  this.feed = {}
  this.datastorePeerlibrary = {}
  this.datastoreNL = {}
  this.datastoreKBL = {}
  this.dataswarm = hyperswarm()
  this.listdata = []
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
  this.feed = hypercore(os.homedir() + '/peerlink/peerlog', {
    valueEncoding: 'json'
  })
  // peer warm cold connections
  this.datastorePeers = hypertrie(os.homedir() + '/peerlink/peernetwork.db', {valueEncoding: 'json'})
  // peer library of joined experiments
  this.datastorePeerlibrary = hypertrie(os.homedir() + '/peerlink/peerlibrary.db', {valueEncoding: 'json'})
  // network library public
  this.datastoreNL = hypertrie(os.homedir() + '/peerlink/librarynetwork.db', {valueEncoding: 'json'})
  // results ledger
  this.datastoreResults = hypertrie(os.homedir() + '/peerlink/resultspeer.db', {valueEncoding: 'json'})
  // knowledge bundle ledger
  this.datastoreKBL = hypertrie(os.homedir() + '/peerlink/kblpeer.db', {valueEncoding: 'json'})
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
}

/**
* return list of warm peers
* @method listWarmPeers
*
*/
PeerStoreWorker.prototype.listWarmPeers = function (callback) {
  this.datastorePeers.list( { ifAvailable: true }, (err, data) => {
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
* return public key for datastore
* @method getPrivatekey
*
*/
PeerStoreWorker.prototype.getPrivatekey = function (callback) {
  const localthis = this
  let pubkey = ''
  this.datastoreNL.ready(() => {
    pubkey = this.datastoreNL.key.toString('hex')
    // join swarm Network
    this.dataswarm.join(this.datastoreNL.key, {
      lookup: true, // find & connect to peers
      announce: true // optional- announce yourself as a connection target
    })

    this.dataswarm.on('connection', function (socket, details) {
      // `details` is a simple object that describes the peer we connected to
      console.log('swarm connect peer1')
      pump(socket, localthis.datastoreNL.replicate(true, { live: true }), socket)
    })
    callback(pubkey)
  })
}

/**
* replicate an explicit peer library ref contract datastore
* @method peerRefContractReplicate
*
*/
PeerStoreWorker.prototype.peerRefContractReplicate = function (key, callback) {
  // replicate
  const localthis = this
  var connectCount = 0
  let rpeer1Key = Buffer.from(key, "hex")
  // has the peers key and datastore been setup already?
  if (this.datastoreNL2 === undefined && key !== 'peer') {
    localthis.datastoreNL2 = hypertrie(os.homedir() + '/peerlink/librarynetwork2.db', rpeer1Key, {valueEncoding: 'json'})
    localthis.dataswarm.join(rpeer1Key, {
      lookup: true, // find & connect to peers
      announce: true // optional- announce yourself as a connection target
    })
    this.datastoreNL2.ready(() => {
      console.log('ready to do replication?')
      localthis.dataswarm.on('connection', function (socket, details) {
        console.log('swarm connect peer')
        connectCount++
        console.log(connectCount)
        pump(socket, localthis.datastoreNL2.replicate(false, { live: true }), socket)
        console.log('after replication')
        localthis.datastoreNL2.list( { ifAvailable: true }, callback)
      })
    })
  } else if (key === 'peer') {
    if (this.datastoreNL2 === undefined) {
      localthis.datastoreNL2 = hypertrie(os.homedir() + '/peerlink/librarynetwork2.db', {valueEncoding: 'json'})
      localthis.datastoreNL2.list( { ifAvailable: true }, callback)
    } else {
      localthis.datastoreNL2.list( { ifAvailable: true }, callback)
    }
  } else {
    console.log('peer shared datastore setup already')
    localthis.datastoreNL2.list( { ifAvailable: true }, callback)
  }
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
* filter by Peer datatypes
* @method peerKBLstart
*
*/
PeerStoreWorker.prototype.peerGETRefContracts = function (getType, callback) {
  // read
  let databack = this.datastorePeerlibrary.list( { ifAvailable: true }, callback)
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
* save new Reference Contract network library
* @method libraryStoreRefContract
*
*/
PeerStoreWorker.prototype.libraryStoreRefContract = function (refContract) {
  // save
  const localthis = this
  this.datastoreNL.put(refContract.hash, refContract.contract, function () {
    console.log('saved hypertrie OK')
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
    console.log('saved hypertrie OK')
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
    console.log('saved hypertrie OK')
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
    console.log('saved hypertrie OK')
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
