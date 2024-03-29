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
import util from 'util'
import events from 'events'

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
  const localthis = this
  this.datastore.put(refContract.hash, refContract.contract, function () {
    console.log('saved KBID hypertrie OK')
    localthis.datastore.get(refContract.hash, console.log)
  })
  return { kbid: true }
}

export default KBIDStoreWorker
