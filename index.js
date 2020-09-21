import pkg from 'websocket'
const WebSocketServer = pkg.server
import http from 'http'
import LibComposer from 'refcontractcomposer'
import SafeFLOW from 'node-safeflow'
import DatastoreWorker from './peerStore.js'
import KBIDstoreWorker from './kbidStore.js'
import fs from 'fs'
import os from 'os'

const liveLibrary = new LibComposer()
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
      // pass to sort data into ref contract types
      let libraryData = {}
      libraryData.data = 'contracts'
      const segmentedRefContracts = liveLibrary.liveLibraryLib.refcontractSperate(data)
      libraryData.referenceContracts = segmentedRefContracts
      // need to split for genesis and peer joined NXPs
      const nxpSplit = liveLibrary.liveLibraryLib.experimentSplit(segmentedRefContracts.experiment)
      libraryData.splitExperiments = nxpSplit
      // look up modules for this experiments
      libraryData.networkExpModules = liveLibrary.liveLibraryLib.expMatchModule(libraryData.referenceContracts.module, nxpSplit.genesis)
      libraryData.networkPeerExpModules = liveLibrary.liveLibraryLib.expMatchGenModule(libraryData.referenceContracts.module, nxpSplit.joined)
      connection.sendUTF(JSON.stringify(libraryData))
    }
    if (msg.type === 'utf8') {
      const o = JSON.parse(msg.utf8Data)
      console.log(o)
      console.log('incoming message')
      if (o.reftype.trim() === 'hello') {
        console.log('conversaton')
        connection.sendUTF(JSON.stringify('talk to CALE'))
      } else if (o.reftype.trim() === 'ignore' && o.type.trim() === 'safeflow' ) {
        if (o.action === 'auth') {
          let authStatus = await liveSafeFLOW.networkAuthorisation(o.network, o.settings)
          // if verified then load starting experiments into ECS-safeFLOW
          connection.sendUTF(JSON.stringify(authStatus))
        }
      } else if (o.type.trim() === 'library' ) {
        // library routing
        if (o.reftype.trim() === 'viewpublickey') {
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
        } else if (o.action === 'extractexperiment') {
          console.log('library utility call')
          let joinExpDisplay = {}
          joinExpDisplay.type = 'extractexperiment'
          joinExpDisplay.data = liveLibrary.liveLibraryLib.extractData(o.data.modules, 'data')
          joinExpDisplay.compute = liveLibrary.liveLibraryLib.extractCompute(o.data.modules, 'compute')
          joinExpDisplay.visualise = liveLibrary.liveLibraryLib.extractVisualise(o.data.modules, 'visualise')
          // look up option contracts for each ref contract type
          let dataOptions = []
          for (let optionD of joinExpDisplay.data) {
            console.log('options list')
            console.log(optionD)
            const refcontract = liveLibrary.liveLibraryLib.refcontractLookup(optionD.option.key, joinExpDisplay.data)
            dataOptions.push(refcontract)
          }
          let computeOptions = []
          for (let optionD of joinExpDisplay.compute) {
            const refcontract = liveLibrary.liveLibraryLib.refcontractLookup(optionD.option.key, joinExpDisplay.compute)
            computeOptions.push(refcontract)
          }
          let visOptions = []
          for (let optionD of joinExpDisplay.visualise) {
            const refcontract = liveLibrary.liveLibraryLib.refcontractLookup(optionD.option.key, joinExpDisplay.visualise)
            visOptions.push(refcontract)
          }
          let experimentOptions = {}
          experimentOptions.data = dataOptions
          experimentOptions.compute = computeOptions
          experimentOptions.visualise = visOptions
          joinExpDisplay.options = experimentOptions
          // setup toolbar info.
          /*
          console.log('VIS look up')
          console.log(joinExpDisplay.visualise)
          let refContractLookup = liveLibrary.liveLibraryLib.refcontractLookup(joinExpDisplay.visualise, joinExpDisplay.visualise)
          joinExpDisplay.visualise.option = refContractLookup
          joinExpDisplay.visualise.tempvis = tempNew */
          connection.sendUTF(JSON.stringify(joinExpDisplay))
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
