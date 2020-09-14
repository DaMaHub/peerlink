'use strict'
/**
*  KBIDStoreWorker knowledge bundle ledger
*
*
* @class KBIDStoreWorker
* @package    safeFlow
* @copyright  Copyright (c) 2019 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
const util = require('util')
const events = require('events')

var KBIDStoreWorker = function (store) {
  events.EventEmitter.call(this)
  this.datastore = store
  this.listdata = []
}

/**
* inherits core emitter class within this class
* @method inherits
*/
util.inherits(KBIDStoreWorker, events.EventEmitter)

/**
* filter by Peer datatypes
* @method peerGETkbids
*
*/
KBIDStoreWorker.prototype.peerGETkbids = function (getType, callback) {
  // read
  console.log('peer KBID query')
  let databack = this.datastore.list( { ifAvailable: true }, callback)
  return true
}

/**
* save new kbid entry
* @method peerStoreKBIDentry
*
*/
KBIDStoreWorker.prototype.peerStoreKBIDentry = function (refContract) {
  // save
  console.log('save new KBID entry')
  console.log(refContract)
  const localthis = this
  this.datastore.put(refContract.hash, refContract.contract, function () {
    console.log('saved KBID hypertrie OK')
    localthis.datastore.get(refContract.hash, console.log)
  })
  return { kbid: true }
}

module.exports = KBIDStoreWorker
