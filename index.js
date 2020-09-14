const WebSocketServer = require('websocket').server
const http = require('http')
const DatastoreWorker = require('./peerStore.js')
const KBIDstoreWorker = require('./kbidStore.js')
const fs = require('fs')
var os = require("os")

let peerStoreLive =  new DatastoreWorker()
let kbidStoreLive

const server = http.createServer((request, response) => {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
})

server.listen(9888, () => {
  console.log('listening on *:9888')
  if (fs.existsSync(os.homedir() + '/peerlink')) {
    // Do something
    console.log('yes path existings')
    // setup datastores
    peerStoreLive.setupDatastores()
  } else {
    console.log('no path ')
    fs.mkdir(os.homedir() + '/peerlink', function(err) {
      if (err) {
        console.log(err)
      } else {
        console.log("New directory successfully created.")
        // setup datastores
        peerStoreLive.setupDatastores()
      }
    })
  }
})

// create the server
let wsServer = new WebSocketServer({
  httpServer: server
})

// WebSocket server
wsServer.on('request', request => {
  let connection = request.accept(null, request.origin)
  console.log('someone connected')

  connection.on('message', async msg => {
    // kbidStoreLive = new KBIDstoreWorker(datastoreK)
    function callbackKey (data) {
      console.log('key data back')
      console.log(data)
      let pubkeyData = {}
      pubkeyData.type = 'publickey'
      pubkeyData.pubkey = data
      connection.sendUTF(JSON.stringify(pubkeyData))
    }

    function callback (err, data) {
      console.log('data from hyperieiee')
      console.log(err)
      console.log(data)
      connection.sendUTF(JSON.stringify(data))
    }
    if (msg.type === 'utf8') {
      const o = JSON.parse(msg.utf8Data)
      console.log('incoming message')
      console.log(o.reftype.trim())
      if (o.reftype.trim() === 'hello') {
        console.log('conversaton')
        connection.sendUTF(JSON.stringify('talk to CALE'))
      } else if (o.reftype.trim() === 'viewpublickey') {
        // two peer syncing reference contracts
        const pubkey = peerStoreLive.getPrivatekey(callbackKey)
      } else if (o.reftype.trim() === 'replicatekey') {
        // two peer syncing reference contracts
        const replicateStore = peerStoreLive.peerRefContractReplicate(o.publickey)
      } else if (o.reftype.trim() === 'datatype') {
        // query peer hypertrie for datatypes
        if (o.action === 'GET') {
          const datatypeList = peerStoreLive.peerGETRefContracts('datatype', callback)
        } else {
          // save a new refContract
          const newRefContract = o.refContract
          const savedFeedback = peerStoreLive.peerStoreRefContract(o)
          connection.sendUTF(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'compute') {
        // query peer hypertrie for datatypes
        if (o.action === 'GET') {
          peerStoreLive.peerGETRefContracts('compute', callback)
        } else {
          // save a new refContract
          peerStoreLive.peerStoreRefContract(o)
        }
      } else if (o.reftype.trim() === 'units') {
        // query peer hypertrie for Units
        if (o.action === 'GET') {
          peerStoreLive.peerGETRefContracts('units', callback)
        } else {
          // save a new refContract
          peerStoreLive.peerStoreRefContract(o)
        }
      } else if (o.reftype.trim() === 'packaging') {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          peerStoreLive.peerGETRefContracts('packaging', callback)
        } else {
          // save a new refContract
          const savedFeedback = peerStoreLive.peerStoreRefContract(o)
          connection.sendUTF(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'module') {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          peerStoreLive.peerGETRefContracts('module', callback)
        } else {
          // save a new refContract
          const savedFeedback = peerStoreLive.peerStoreRefContract(o)
          connection.sendUTF(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'visualise') {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          peerStoreLive.peerGETRefContracts('visualise', callback)
        } else {
          // save a new refContract
          const savedFeedback = peerStoreLive.peerStoreRefContract(o)
          connection.sendUTF(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'experiment') {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          peerStoreLive.peerGETRefContracts('experiment', callback)
        } else {
          // save a new refContract
          const savedFeedback = peerStoreLive.peerStoreRefContract(o)
          connection.sendUTF(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'kbid') {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          kbidStoreLive.peerGETkbids('kbid', callback)
        } else {
          // save a new refContract
          const savedFeedback = kbidStoreLive.peerStoreKBIDentry(o)
          connection.sendUTF(JSON.stringify(savedFeedback))
        }
      } else {
        clicks += 1
        console.log('incrementing clicks to', clicks)
      }
    }
  })

  connection.on('close', connection => {
  })
})
