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
  this.datastore = {}
  this.datastorePair = {}
  this.dataswarm = hyperswarm()
  this.datastoreK = {}
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
  this.datastore = hypertrie(os.homedir() + '/peerlink/datahspeer1.db', {valueEncoding: 'json'})
  this.datastoreK = hypertrie(os.homedir() + '/peerlink/kbidpeer1.db', {valueEncoding: 'json'})
  console.log('store and KBID workers live')
  // console.log(peerStoreLive)
}

/**
* return public key for datastore
* @method getPrivatekey
*
*/
PeerStoreWorker.prototype.getPrivatekey = function (callback) {
  const localthis = this
  let pubkey = ''
  this.datastore.ready(() => {
    pubkey = this.datastore.key.toString('hex')
    console.log('get public key datastore or share')
    console.log(this.datastore.key)
    // join swarm Network
    this.dataswarm.join(this.datastore.key, {
      lookup: true, // find & connect to peers
      announce: true // optional- announce yourself as a connection target
    })

    this.dataswarm.on('connection', function (socket, details) {
      // `details` is a simple object that describes the peer we connected to
      console.log('swarm connect peer1')
      pump(socket, localthis.datastore.replicate(true, { live: true }), socket)
    })
    callback(pubkey)
  })
}

/**
* filter by Peer datatypes
* @method peerKBLstart
*
*/
PeerStoreWorker.prototype.peerGETRefContracts = function (getType, callback) {
  // read
  console.log('peer data datype query')
  let databack = this.datastore.list( { ifAvailable: true }, callback)
  let databackP = this.datastorePair.list( { ifAvailable: true }, callback)
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
  let databack = this.datastore.list( { ifAvailable: true }, callback)
  return true
}


/**
* save new Reference Contract
* @method peerStoreRefContract
*
*/
PeerStoreWorker.prototype.peerStoreRefContract = function (refContract) {
  // save
  const localthis = this
  this.datastore.put(refContract.hash, refContract.contract, function () {
    console.log('saved hypertrie OK')
    localthis.datastore.get(refContract.hash, console.log)
  })
  let returnMessage = {}
  returnMessage.stored = true
  returnMessage.type = refContract.reftype
  returnMessage.key = refContract.hash
  returnMessage.contract = refContract.contract
  return returnMessage
}

/**
* replicate an explicit peer ref contract datastore
* @method peerRefContractReplicate
*
*/
PeerStoreWorker.prototype.peerRefContractReplicate = function (key) {
  // replicate
  const localthis = this
  var connectCount = 0
  let rpeer1Key = Buffer.from(key, "hex")

  this.datastorePair = hypertrie(os.homedir() + '/peerlink/peerpair1.db', rpeer1Key, {valueEncoding: 'json'})

  this.dataswarm.join(rpeer1Key, {
    lookup: true, // find & connect to peers
    announce: true // optional- announce yourself as a connection target
  })

  this.datastorePair.ready(() => {
    console.log('ready to do replication?')
    localthis.dataswarm.on('connection', function (socket, details) {
      console.log('swarm connect peer')
      connectCount++
      console.log(connectCount)
      // socket.write('three jioned')
      pump(socket, localthis.datastorePair.replicate(false, { live: true }), socket)
      console.log('after replication')
    })
  })
}

export default PeerStoreWorker
