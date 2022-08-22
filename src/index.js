'use strict'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))
// console.log('path')
// console.log(_dirname)
import { createServer } from 'https'
// import { createServer } from 'http'
import fs from 'fs'
import crypto from 'crypto'
import { WebSocketServer } from 'ws'
import uuid from 'uuid'
import throttledQueue from 'throttled-queue'
import CaleAi from 'cale-holism'
import LibComposer from 'librarycomposer'
import SafeFLOW from 'node-safeflow'
import DatastoreWorker from './peerStore.js'
import KBIDstoreWorker from './kbidStore.js'
import FileParser from './fileParser.js'
import os from 'os'
import dotenv from 'dotenv'
dotenv.config()

const localpath = '/peerstore'
let jwtList = []
let pairSockTok = {}
const liveCALEAI = new CaleAi()
const liveLibrary = new LibComposer()
let peerStoreLive =  new DatastoreWorker(localpath) // what PtoP infrastructure running on?  Safe Network, Hypercore? etc
// OK with safeFLOW setup then bring peerDatastores to life
peerStoreLive.setupDatastores()
const liveParser = new FileParser(localpath)
let kbidStoreLive // not in use
// const liveSafeFLOW = new SafeFLOW()
let liveSafeFLOW = {}
let setFlow = false
let libraryData = {}
let rateQueue = []
const options = {
  key: fs.readFileSync(_dirname + '/key.pem'),
  cert: fs.readFileSync(_dirname + '/cert.pem')
}

// const server = createServer((request, response) => {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
// })
const server = createServer(options, (request, response) => {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
})

server.on('error', function(e) {
  console.log('problem with request: ' + e.stack);
})

server.listen(9888, () => {
  console.log('listening on *:9888')
  console.log(process.env.npm_package_version)
})

const wsServer = new WebSocketServer({ server })

// listenr for data back from ECS
function peerListeners (ws) {
  // console.log('batch of safeFlowlisterners')
  liveSafeFLOW = new SafeFLOW()
  setFlow = true
  // callbacks for datastores
  function resultsCallback (entity, err, data) {
    let resultMatch = {}
    if (data !== null) {
      resultMatch.entity = entity
      resultMatch.data = data
    } else {
      resultMatch.entity = entity
      resultMatch.data = false
    }
    liveSafeFLOW.resultsFlow(resultMatch)
  }

  // listenr for data back from ECS
  liveSafeFLOW.on('displayEntity', (data) => {
    data.type = 'newEntity'
    ws.send(JSON.stringify(data))
  })
  let deCount = liveSafeFLOW.listenerCount('displayEntity')
  liveSafeFLOW.on('displayEntityRange', (data) => {
    data.type = 'newEntityRange'
    ws.send(JSON.stringify(data))
  })
  liveSafeFLOW.on('displayUpdateEntity', (data) => {
    data.type = 'updateEntity'
    ws.send(JSON.stringify(data))
  })
  liveSafeFLOW.on('displayUpdateEntityRange', (data) => {
    data.type = 'updateEntityRange'
    ws.send(JSON.stringify(data))
  })
  liveSafeFLOW.on('displayEmpty', (data) => {
    data.type = 'displayEmpty'
    ws.send(JSON.stringify(data))
  })
  liveSafeFLOW.on('updateModule', (data) => {
    let moduleRefContract = liveLibrary.liveComposer.moduleComposer(data, 'update')
    const savedFeedback = peerStoreLive.peerStoreRefContract(moduleRefContract)
  })
  liveSafeFLOW.on('storePeerResults', (data) => {
    const savedFeedback = peerStoreLive.peerStoreResults(data)
  })

  liveSafeFLOW.on('checkPeerResults', async (data) => {
    await peerStoreLive.peerStoreCheckResults(data, resultsCallback)
  })

  liveSafeFLOW.on('kbledgerEntry', (data) => {
    const savedFeedback = peerStoreLive.peerKBLentry(data)
  })
}
// WebSocket server
wsServer.on('connection', function ws(ws, req) {
  // console.log('peer connected websocket')
  // console.log(wsServer.clients)
  // wsServer.clients.forEach(element => console.log(Object.keys(element)))
  // console.log(wsServer.clients.size)
  // call back from results etc needing to get back to safeFLOW-ecs
  // check if function is live?
  ws.id = uuid.v4()

  ws.on('message', async msg => {
    // which socket id?
    // console.log('messageIN')

    function callbackKey (data) {
      let pubkeyData = {}
      pubkeyData.type = 'publickey'
      pubkeyData.pubkey = data
      ws.send(JSON.stringify(pubkeyData))
    }
    function callbackOpenLibrary (data) {
      let pubkeyData = {}
      pubkeyData.type = 'open-library'
      pubkeyData.data = data
      ws.send(JSON.stringify(pubkeyData))
    }
    function callbackPeerNetwork (data) {
      let peerNData = {}
      peerNData.type = 'new-peer'
      peerNData.data = data
      ws.send(JSON.stringify(peerNData))
    }
    function callbackWarmPeers (data) {
      let peerNData = {}
      peerNData.type = 'warm-peers'
      peerNData.data = data
      ws.send(JSON.stringify(peerNData))
    }
    function callbacklibrary (err, data) {
      // pass to sort data into ref contract types
      libraryData.data = 'contracts'
      libraryData.type = 'publiclibrary'
      const segmentedRefContracts = liveLibrary.liveRefcontUtility.refcontractSperate(data)
      libraryData.referenceContracts = segmentedRefContracts
      // need to split for genesis and peer joined NXPs
      const nxpSplit = liveLibrary.liveRefcontUtility.experimentSplit(segmentedRefContracts.experiment)
      libraryData.splitExperiments = nxpSplit
      // look up modules for this experiments
      libraryData.networkExpModules = liveLibrary.liveRefcontUtility.expMatchModuleGenesis(libraryData.referenceContracts.module, nxpSplit.genesis)
      libraryData.networkPeerExpModules = liveLibrary.liveRefcontUtility.expMatchModuleJoined(libraryData.referenceContracts.module, nxpSplit.joined)
      ws.send(JSON.stringify(libraryData))
    }

    function callbackPlibraryAdd (err, data) {
      let libraryData = {}
      libraryData.data = data
      libraryData.type = 'publiclibraryaddcomplete'
      ws.send(JSON.stringify(libraryData))
    }

    function callbackReplicatelibrary (err, data) {
      // pass to sort data into ref contract types
      libraryData.data = 'contracts'
      libraryData.type = 'replicatedata-publiclibrary'
      const segmentedRefContracts = liveLibrary.liveRefcontUtility.refcontractSperate(data)
      libraryData.referenceContracts = segmentedRefContracts
      // need to split for genesis and peer joined NXPs
      const nxpSplit = liveLibrary.liveRefcontUtility.experimentSplit(segmentedRefContracts.experiment)
      libraryData.splitExperiments = nxpSplit
      // look up modules for this experiments
      libraryData.networkExpModules = liveLibrary.liveRefcontUtility.expMatchModuleGenesis(libraryData.referenceContracts.module, nxpSplit.genesis)
      libraryData.networkPeerExpModules = liveLibrary.liveRefcontUtility.expMatchModuleJoined(libraryData.referenceContracts.module, nxpSplit.joined)
      ws.send(JSON.stringify(libraryData))
    }

    function callbackReplicatereceive (data) {
      console.log('repliate feedvack peerlink')
      let peerRdata = {}
      peerRdata.type = 'replicate-publiclibrary'
      peerRdata.data = data
      ws.send(JSON.stringify(peerRdata))
    }

    function callbackLifeboard (err, data) {
      // pass to sort data into ref contract types
      let libraryData = {}
      libraryData.data = 'contracts'
      libraryData.type = 'peerlifeboard'
      libraryData.lifeboard = data
      ws.send(JSON.stringify(libraryData))
    }

    function callbackBentospace (err, data) {
      // pass to sort data into ref contract types
      let blibraryData = {}
      blibraryData.type = 'bentospaces'
      blibraryData.data = data
      ws.send(JSON.stringify(blibraryData))
    }

    function callbackListBentospace (data) {
      // pass to sort data into ref contract types
      let blibraryData = {}
      blibraryData.type = 'bentospaces-list'
      blibraryData.data = data
      // blibraryData.bentospaces = data
      ws.send(JSON.stringify(blibraryData))
    }

    function callbackPeerDelete(err, data) {
      // pass to sort data into ref contract types
      let libraryData = {}
      libraryData.data = data
      libraryData.type = 'peerprivatedelete'
    }
    function callbackPeerLib (err, data) {
      // pass to sort data into ref contract types
      libraryData.data = 'contracts'
      libraryData.type = 'peerprivate'
      const segmentedRefContracts = liveLibrary.liveRefcontUtility.refcontractSperate(data)
      libraryData.referenceContracts = segmentedRefContracts
      // need to split for genesis and peer joined NXPs
      const nxpSplit = liveLibrary.liveRefcontUtility.experimentSplit(segmentedRefContracts.experiment)
      libraryData.splitExperiments = nxpSplit
      // look up modules for this experiments
      libraryData.networkExpModules = liveLibrary.liveRefcontUtility.expMatchModuleGenesis(libraryData.referenceContracts.module, nxpSplit.genesis)
      libraryData.networkPeerExpModules = liveLibrary.liveRefcontUtility.expMatchModuleJoined(libraryData.referenceContracts.module, nxpSplit.joined)
      ws.send(JSON.stringify(libraryData))
    }
    // logic for incoming request flows
    const o = JSON.parse(msg)
    // console.log('peer link IN message')
    // console.log(o)
    // first check if firstime connect
    if (o.reftype.trim() === 'ignore' && o.type.trim() === 'safeflow' ) {
      if (o.action === 'selfauth') {
        // secure connect to safeFLOW
        // let authStatus = await liveSafeFLOW.networkAuthorisation(o.settings)
        // OK with safeFLOW setup then bring peerDatastores to life
        // peerStoreLive.setupDatastores()
        // ws.send(JSON.stringify(authStatus))
        peerListeners(ws)
        let authPeer = true
        let tokenString = crypto.randomBytes(64).toString('hex')
        jwtList.push(tokenString)
        // create socketid, token pair
        pairSockTok[ws.id] = tokenString
        pairSockTok[o.data.peer] = tokenString
        let authStatus = await liveSafeFLOW.networkAuthorisation(o.settings)
        // send back JWT
        authStatus.jwt = tokenString
        ws.send(JSON.stringify(authStatus))
      } else if (o.action === 'cloudauth') {
        // console.log('auth1')
        // does the username and password on the allow list?
        let allowPeers = JSON.parse(process.env.PEER_LIST)
        let authPeer = false
        for (let pID of allowPeers) {
          if (pID.peer === o.data.peer && pID.pw === o.data.password) {
            authPeer = true
          }
        }
        // is the peer already connected and authorised?
        // no peers connected and autherise
        let getAuth = Object.keys(pairSockTok)
        let numAuth = getAuth.length
        // can only be one token auth at same time
        if (jwtList.length > 0) {
          authPeer = false
        }
        // is the peer already connected?
        let alreadyConnect = pairSockTok[o.data.peer]
        let peerAuthed = pairSockTok[ws.id]
        if (authPeer === true && alreadyConnect === undefined) {
          // setup safeFLOW
          if (setFlow === false && alreadyConnect === undefined) {
            console.log('activate listeners')
            peerListeners(ws)
          }
          // form token  (need to upgrade proper JWT)
          let tokenString = crypto.randomBytes(64).toString('hex')
          jwtList.push(tokenString)
          // create socketid, token pair
          pairSockTok[ws.id] = tokenString
          pairSockTok[o.data.peer] = tokenString
          let authStatus = await liveSafeFLOW.networkAuthorisation(o.settings)
          // send back JWT
          authStatus.jwt = tokenString
          ws.send(JSON.stringify(authStatus))
        } else {
          let authFailStatus = {}
          authFailStatus.safeflow = true
          authFailStatus.type = 'auth'
          authFailStatus.auth = false
          ws.send(JSON.stringify(authFailStatus))
        }
      }
    }
    // need to check if cloud account is allow access to process message?
    // be good use of JWT TODO
    // valid jwt?
    let jwtStatus = false
    for (let pt of jwtList) {
      if (pt === o.jwt) {
        jwtStatus = true
      } else {
        /* let authFailStatus = {}
        authFailStatus.safeflow = true
        authFailStatus.type = 'auth'
        authFailStatus.auth = false
        ws.send(JSON.stringify(authFailStatus)) */
      }
    }

    if (jwtStatus === true) {
      if (o.reftype.trim() === 'ignore' && o.type.trim() === 'caleai') {
        if (o.action === 'question') {
          // send to CALE NLP path
          let replyData = liveCALEAI.nlpflow(o.data)
          let caleReply = {}
          caleReply.type = 'cale-reply'
          caleReply.data = {}
          ws.send(JSON.stringify(replyData))
        } else if (o.action === 'future') {
          // send to routine for prediction or to chat interface to say CALE cannot help right now
          /* let futureData = liveCALEAI.routineFuture()
          let caleFuture = {}
          caleFuture.type = 'cale-future'
          caleFuture.data = {}
          ws.send(JSON.stringify(futureData)) */
        }
      } else if (o.reftype.trim() === 'ignore' && o.type.trim() === 'safeflow' ) {
        if (o.action === 'auth') {
          // secure connect to safeFLOW
          let authStatus = await liveSafeFLOW.networkAuthorisation(o.settings)
          // OK with safeFLOW setup then bring peerDatastores to life
          // peerStoreLive.setupDatastores()
          ws.send(JSON.stringify(authStatus))
        } else if (o.action === 'cloudauth') {
          console.log('auth2')
          // does the username and password on the allow list?
          // form token  (need to upgrade proper JWT)
          let tokenString = crypto.randomBytes(64).toString('hex')
          jwtList.push(tokenString)
          let authPeer = false
          for (let pID of allowPeers) {
            if (pID.peer === o.data.peer && pID.pw === o.data.password) {
              authPeer = true
            }
          }
          if (authPeer === true) {
            // setup safeFLOW
            let authStatus = await liveSafeFLOW.networkAuthorisation(o.settings)
            // send back JWT
            authStatus.jwt = tokenString
            ws.send(JSON.stringify(authStatus))
          } else {
            let authFailStatus = {}
            authFailStatus.safeflow = true
            authFailStatus.type = 'auth'
            authFailStatus.auth = false
            ws.send(JSON.stringify(authFailStatus))
          }
        } else if (o.action === 'dataAPIauth') {
            let datastoreStatus = await liveSafeFLOW.datastoreAuthorisation(o.settings)
            // if verified then load starting experiments into ECS-safeFLOW
            ws.send(JSON.stringify(datastoreStatus))
            // check the public network library
            // peerStoreLive.peerRefContractReplicate('peer', callbacklibrary)
        } else if (o.action === 'disconnect') {
          console.log('safelow ws message exit')
          // in cloud mode cannot close whole app
          // remove JWT from list
          let index = jwtList.indexOf(o.jwt)
          jwtList.splice(index, 1)
          pairSockTok = {}
          // process.exit(0)
          liveSafeFLOW = {}
          setFlow = false
          ws.on('close', ws => {
            console.log('close manual')
            // process.exit(0)
            jwtList = []
            pairSockTok = {}
            liveSafeFLOW = {}
            setFlow = false
          })
        } else if (o.action === 'networkexperiment') {
          // send summary info that HOP has received NXP bundle
          let ecsData = await liveSafeFLOW.startFlow(o.data)
          let summaryECS = {}
          summaryECS.type = 'ecssummary'
          summaryECS.data = ecsData
          ws.send(JSON.stringify(summaryECS))
        } else if (o.action === 'updatenetworkexperiment') {
          // update to existing live ECS entity
          let ecsDataUpdate = await liveSafeFLOW.startFlow(o.data)
        }
      } else if (o.type.trim() === 'library' ) {
        console.log('biary')
        console.log(o)
        // library routing
        if (o.reftype.trim() === 'convert-csv-json') {
          console.log('csv jon start')
          console.log(o)
          // save protocol original file save and JSON for HOP
          if (o.data.source === 'local') {
            await liveParser.localFileParse(o, ws)
          } else if (o.data.source === 'web') {
            liveParser.webFileParse(o, ws)
          }
        } else if (o.reftype.trim() === 'sync-nxp-data') {
          console.log('request to sync data for a contract')
          // route to peerstore to replicate
        } else if (o.reftype.trim() === 'save-json-json') {
            if (o.data.source === 'local') {
              await liveParser.localJSONfile(o, ws)
            } else if (o.data.source === 'web') {
              liveParser.webJSONfile(o, ws)
            }
        } else if (o.reftype.trim() === 'viewpublickey') {
          // two peer syncing reference contracts
          const pubkey = peerStoreLive.singlePublicKey('', callbackKey)
        } else if (o.reftype.trim() === 'openlibrary') {
          // two peer syncing reference contracts
          const pubkey = peerStoreLive.openLibrary(o.data, callbackOpenLibrary)
        } else if (o.reftype.trim() === 'keymanagement') {
          peerStoreLive.keyManagement(callbackKey)
        } else if (o.reftype.trim() === 'peer-add') {
          peerStoreLive.addPeer(o.data, callbackPeerNetwork)
        } else if (o.reftype.trim() === 'warm-peers') {
          peerStoreLive.listWarmPeers(callbackWarmPeers, callbacklibrary)
        } else if (o.reftype.trim() === 'addpubliclibraryentry') {
          // take the ID of nxp selected to added to peers own public library
          peerStoreLive.publicLibraryAddentry(o.data, callbackPlibraryAdd)
        } else if (o.reftype.trim() === 'removetemppubliclibrary') {
          // remove temp peers friends library
          peerStoreLive.publicLibraryRemoveTempNL(o.data, 'temp')
        } else if (o.reftype.trim() === 'replicatekey') {
          // two peer syncing reference contracts
          const replicateStore = peerStoreLive.publicLibraryReceive(o.publickey, callbackReplicatereceive)
        } else if (o.reftype.trim() === 'view-replicatelibrary') {
          // read the replicate library
          peerStoreLive.libraryGETReplicateLibrary(o.publickey, callbackReplicatelibrary)
        } else if (o.reftype.trim() === 'publiclibrary') {
          peerStoreLive.libraryGETRefContracts('all', callbacklibrary)
        } else if (o.reftype.trim() === 'privatelibrary') {
          peerStoreLive.peerGETRefContracts('all', callbackPeerLib)
        } else if (o.reftype.trim() === 'removepeer') {
          peerStoreLive.peerREMOVERefContracts(o.data, callbackPeerDelete)
        } else if (o.reftype.trim() === 'datatype') {
          // query peer hypertrie for datatypes
          if (o.action === 'GET') {
            const datatypeList = peerStoreLive.libraryGETRefContracts('datatype', callbacklibrary)
          } else {
            // save a new refContract
            const newRefContract = o.refContract
            const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
            ws.send(JSON.stringify(savedFeedback))
          }
        } else if (o.reftype.trim() === 'compute') {
          // query peer hypertrie for datatypes
          if (o.action === 'GET') {
            // peerStoreLive.peerGETRefContracts('compute', callback)
          } else {
            // save a new refContract
            peerStoreLive.libraryStoreRefContract(o)
          }
        } else if (o.reftype.trim() === 'units') {
          // query peer hypertrie for Units
          if (o.action === 'GET') {
            // peerStoreLive.peerGETRefContracts('units', callback)
          } else {
            // save a new refContract
            peerStoreLive.libraryStoreRefContract(o)
          }
        } else if (o.reftype.trim() === 'packaging') {
          // query peer hypertrie for
          if (o.action === 'GET') {
            // peerStoreLive.peerGETRefContracts('packaging', callback)
          } else {
            // save a new refContract
            const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
            ws.send(JSON.stringify(savedFeedback))
          }
        } else if (o.reftype.trim() === 'visualise') {
          // query peer hypertrie for
          if (o.action === 'GET') {
            // peerStoreLive.peerGETRefContracts('visualise', callback)
          } else {
            // save a new refContract
            const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
            ws.send(JSON.stringify(savedFeedback))
          }
        } else if (o.reftype.trim() === 'experiment') {
          // query peer hypertrie for
          if (o.action === 'GET') {
            // peerStoreLive.peerGETRefContracts('experiment', callback)
          } else {
            // save a new refContract
            const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
            ws.send(JSON.stringify(savedFeedback))
          }
        } else if (o.reftype.trim() === 'newexperimentmodule') {
          // a new genesis network experiment to store to network library
          let moduleGenesisList = []
          let moduleGenesisExpanded = []
          let newModCount = o.data.length
          for (let mh of o.data) {
            const moduleRefContract = liveLibrary.liveComposer.moduleComposer(mh, '')
            const moduleRefContractReady = JSON.stringify(moduleRefContract)
            const savedFeedback = peerStoreLive.libraryStoreRefContract(moduleRefContract)
            moduleGenesisList.push(savedFeedback.key)
            // stand key value format or query and get back ref contract double check TODO
            let moduleContract = {}
            moduleContract.key = savedFeedback.key
            moduleContract.value = savedFeedback.contract
            moduleGenesisExpanded.push(moduleContract) // .contract)
            newModCount--
          }
          if (newModCount === 0) {
            // aggregate all modules into exeriment contract
            let genesisRefContract = liveLibrary.liveComposer.experimentComposerGenesis(moduleGenesisList)
            // double check they are created
            const savedFeedback = peerStoreLive.libraryStoreRefContract(genesisRefContract)
            savedFeedback.expanded = moduleGenesisExpanded
            ws.send(JSON.stringify(savedFeedback))
          }
        } else if (o.reftype.trim() === 'joinexperiment') {
          let moduleJoinedList = []
          let moduleJoinedExpanded = []
          let newModCount = o.data.exp.modules.length
          // for each module in experiment, add peer selections
          // loop over list of module contract to make genesis ie first
          for (let mh of o.data.exp.modules) {
            // prepare new modules for this peer  ledger
            let peerModules = {}
            // look up module template genesis contract
            if (mh.value.info.moduleinfo.name === 'question') {
              peerModules.type = 'question'
              peerModules.question = mh.value.info.question
            } else if (mh.value.info.moduleinfo.name === 'data') {
              peerModules.type = 'data'
              peerModules.data = o.data.options.data
            } else if (mh.value.info.moduleinfo.name === 'compute') {
              peerModules.type = 'compute'
              peerModules.compute = mh.value.info.refcont
              peerModules.controls = o.data.options.compute
              peerModules.settings = o.data.options.visualise
              } else if (mh.value.info.moduleinfo.name === 'visualise') {
              peerModules.type = 'visualise'
              peerModules.visualise = mh.value.info.refcont
              peerModules.settings = o.data.options.visualise
            }
            let moduleRefContract = liveLibrary.liveComposer.moduleComposer(peerModules, 'join')
            const savedFeedback = peerStoreLive.peerStoreRefContract(moduleRefContract)
            moduleJoinedList.push(savedFeedback.key)
            // form key value refcont structure
            let moduleKeyValue = {}
            moduleKeyValue.key = savedFeedback.key
            moduleKeyValue.value = savedFeedback.contract
            moduleJoinedExpanded.push(moduleKeyValue)
            newModCount--
          }
          // check all modules are present and create peers network refcont joined
          if (newModCount === 0) {
            // aggregate all modules into exeriment contract
            // double check they are created
            let joinRefContract = liveLibrary.liveComposer.experimentComposerJoin(moduleJoinedList)
            const savedFeedback = peerStoreLive.peerStoreRefContract(joinRefContract)
            savedFeedback.expanded = moduleJoinedExpanded
            ws.send(JSON.stringify(savedFeedback))
          }
        } else if (o.reftype.trim() === 'genesisexperiment') {
          let genesisRefContract = liveLibrary.liveComposer.experimentComposerGenesis(o.data)
          const savedFeedback = peerStoreLive.libraryStoreRefContract(genesisRefContract)
          ws.send(JSON.stringify(savedFeedback))
        } else if (o.reftype.trim() === 'kbid') {
          // query peer hypertrie for
          if (o.action === 'GET') {
            kbidStoreLive.peerGETkbids('kbid', callback)
          } else {
            // save a new refContract
            const savedFeedback = kbidStoreLive.peerStoreKBIDentry(o)
            ws.send(JSON.stringify(savedFeedback))
          }
        } else if (o.action === 'extractexperimentmodules') {
          let joinExpDisplay = {}
          joinExpDisplay.type = 'extractexperimentmodules'
          joinExpDisplay.data = liveLibrary.liveRefcontUtility.extractData(o.data.modules, 'data')
          joinExpDisplay.compute = liveLibrary.liveRefcontUtility.extractCompute(o.data.modules, 'compute')
          joinExpDisplay.visualise = liveLibrary.liveRefcontUtility.extractVisualise(o.data.modules, 'visualise')
          // look up option contracts for each ref contract type
          let dataOptions = []
          for (let optionD of joinExpDisplay.data) {
            const refcontract = liveLibrary.liveRefcontUtility.refcontractLookup(optionD.option.key, joinExpDisplay.data)
            dataOptions.push(refcontract)
          }
          let computeOptions = []
          for (let optionD of joinExpDisplay.compute) {
            const refcontract = liveLibrary.liveRefcontUtility.refcontractLookup(optionD.option.key, joinExpDisplay.compute)
            computeOptions.push(refcontract)
          }
          let visOptions = []
          for (let optionD of joinExpDisplay.visualise) {
            const refcontract = liveLibrary.liveRefcontUtility.refcontractLookup(optionD.option.key, joinExpDisplay.visualise)
            visOptions.push(refcontract)
          }
          let experimentOptions = {}
          experimentOptions.data = dataOptions
          experimentOptions.compute = computeOptions
          experimentOptions.visualise = visOptions
          joinExpDisplay.options = experimentOptions
          ws.send(JSON.stringify(joinExpDisplay))
        } else if (o.reftype.trim() === 'module') {
          // query peer hypertrie
          if (o.action === 'GET') {
            peerStoreLive.peerGETRefContracts('module', callback)
          } else {
            // save a new refContract
            const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
            ws.send(JSON.stringify(savedFeedback))
          }
        } else if (o.reftype.trim() === 'moduletemp') {
          // create new temp modules for new experiment
          let modCount = 1
          let moduleHolder = []
          for (const mc of o.data) {
            const prepareModule = liveLibrary.liveComposer.moduleComposer(mc, '')
            let moduleContainer = {}
            moduleContainer.name = prepareModule.contract.concept.type
            moduleContainer.id = modCount
            moduleContainer.refcont = prepareModule.hash
            moduleHolder.push(moduleContainer)
            modCount++
          }
          let moduleTempData = {}
          moduleTempData.type = 'modulesTemp'
          moduleTempData.data = moduleHolder
          ws.send(JSON.stringify(moduleTempData))
        } else if (o.reftype.trim() === 'newmodules') {
          let moduleRefContract = liveLibrary.liveComposer.moduleComposer(o.data, 'join')
          const savedFeedback = peerStoreLive.libraryStoreRefContract(moduleRefContract)
          ws.send(JSON.stringify(savedFeedback))
        } else if (o.reftype.trim() === 'newlifeboard') {
          let lifeboardRefContract = liveLibrary.liveComposer.lifeboardComposer(o.data, 'new')
          const saveLB = peerStoreLive.lifeboardStoreRefContract(lifeboardRefContract)
          ws.send(JSON.stringify(saveLB))
        } else if (o.reftype.trim() === 'addlifeboard') {
          let lifeboardMember = liveLibrary.liveComposer.lifeboardComposer(o.data, 'member')
          const saveLBmember = peerStoreLive.lifeboardStoreRefContract(lifeboardMember)
          ws.send(JSON.stringify(saveLBmember))
        } else if (o.reftype.trim() === 'peerLifeboard') {
          peerStoreLive.peerGETLifeboards('all', callbackLifeboard)
        } else {
          console.log('network library no match')
        }
      } else if (o.reftype.trim() === 'bentospace') {
        console.log('bento space  what sub action?')
        console.log(o)
          if (o.action.trim() === 'save-position') {
            peerStoreLive.addBentospaces(o.data, callbackBentospace)
          } else if (o.action.trim() === 'list-position') {
            peerStoreLive.listBentospaces(callbackListBentospace)
          } else {
            console.log('no action bentospace')
          }
      } else {
        console.log('nothing matched tell of that')
      }
    } else {
      console.log('no furtherXXXXXXXXXX cloud')
    }
  })
  ws.on('close', ws => {
    console.log('close ws direct')
    jwtList = []
    pairSockTok = {}
    liveSafeFLOW = {}
    setFlow = false
    process.exit(0)
  })
  ws.on('error', ws => {
    console.log('socket eeeerrrorrrr')
    process.exit(1)
  })
})

process.on('unhandledRejection', function(err) {
  console.log(err);
})
// console.log('memoryPrint Start')
// console.log(process.memoryUsage())
