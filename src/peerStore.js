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
  // peer library of joined experiments
  this.datastorePeerlibrary = hypertrie(os.homedir() + '/peerlink/peerlibrary.db', {valueEncoding: 'json'})
  // network library public
  this.datastoreNL = hypertrie(os.homedir() + '/peerlink/librarynetwork.db', {valueEncoding: 'json'})
  // knowledge bundle ledger
  this.datastoreKBL = hypertrie(os.homedir() + '/peerlink/kblpeer.db', {valueEncoding: 'json'})
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
  console.log('peer data datype query')
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
  console.log('peer data datype query')
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
  console.log('save entry')
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
    localthis.datastorePeerlibrary.get(refContract.hash, console.log)
  })
  let returnMessage = {}
  returnMessage.stored = true
  returnMessage.type = refContract.reftype
  returnMessage.key = refContract.hash
  returnMessage.contract = refContract.contract
  return returnMessage
}

/**
* replicate an explicit peer library ref contract datastore
* @method peerRefContractReplicate
*
*/
PeerStoreWorker.prototype.peerRefContractReplicate = function (key) {
  // replicate
  const localthis = this
  var connectCount = 0
  let rpeer1Key = Buffer.from(key, "hex")
  // this.datastoreNL = hypertrie(os.homedir() + '/peerlink/librarynetwork.db', rpeer1Key, {valueEncoding: 'json'})

  this.dataswarm.join(rpeer1Key, {
    lookup: true, // find & connect to peers
    announce: true // optional- announce yourself as a connection target
  })

  this.datastoreNL.ready(() => {
    console.log('ready to do replication?')
    localthis.dataswarm.on('connection', function (socket, details) {
      console.log('swarm connect peer')
      connectCount++
      console.log(connectCount)
      pump(socket, localthis.datastoreNL.replicate(false, { live: true }), socket)
      console.log('after replication')
    })
  })
}

export default PeerStoreWorker
