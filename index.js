import pkg from 'websocket'
const WebSocketServer = pkg.server
import http from 'http'
import SafeFLOW from 'node-safeflow'
import DatastoreWorker from './peerStore.js'
import KBIDstoreWorker from './kbidStore.js'
import fs from 'fs'
import os from 'os'

const liveSafeFLOW = new SafeFLOW()
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
      let pubkeyData = {}
      pubkeyData.type = 'publickey'
      pubkeyData.pubkey = data
      connection.sendUTF(JSON.stringify(pubkeyData))
    }

    function callback (err, data) {
      console.log('data callback')
      console.log(err)
      connection.sendUTF(JSON.stringify(data))
    }
    if (msg.type === 'utf8') {
      const o = JSON.parse(msg.utf8Data)
      console.log(o)
      console.log('incoming message')
      if (o.reftype.trim() === 'hello') {
        console.log('conversaton')
        connection.sendUTF(JSON.stringify('talk to CALE'))
      } else if (o.reftype.trim() === 'ignore' && o.type.trim() === 'safeflow' ) {
        console.log('safeFLOW input')
        console.log(o)
        // split to type of call allow e.g. auth, get, library etc.
        if (o.action === 'auth') {
          console.log('auth path for safeFLOW')
          let authStatus = await liveSafeFLOW.networkAuthorisation(o.network, o.settings)
          // if verified then load starting experiments into ECS-safeFLOW
          connection.sendUTF(JSON.stringify(authStatus))
        }
        /*
        // pass to sort data into ref contract types
        const segmentedRefContracts = this.state.livesafeFLOW.refcontUtilityLive.refcontractSperate(backJSON)
        console.log('segmentated contracts')
        console.log(segmentedRefContracts)
        this.state.referenceContract = segmentedRefContracts
        // need to split for genesis and peer joined NXPs
        const nxpSplit = this.state.livesafeFLOW.refcontUtilityLive.experimentSplit(segmentedRefContracts.experiment)
        console.log('split------')
        console.log(nxpSplit)
        // look up modules for this experiments
        this.state.networkExpModules = this.state.livesafeFLOW.refcontUtilityLive.expMatchModule(this.state.referenceContract.module, nxpSplit.genesis)
        this.state.networkPeerExpModules = this.state.livesafeFLOW.refcontUtilityLive.expMatchGenModule(this.state.referenceContract.module, nxpSplit.joined)
        console.log(this.state.networkPeerExpModules)
        */
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
