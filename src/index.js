'use strict'
import http from 'http'
import LibComposer from 'librarycomposer'
import SafeFLOW from 'node-safeflow'
import DatastoreWorker from './peerStore.js'
import KBIDstoreWorker from './kbidStore.js'
import fs from 'fs'
import os from 'os'
import pkg from 'websocket'
const WebSocketServer = pkg.server

const liveLibrary = new LibComposer()
const liveSafeFLOW = new SafeFLOW()
let peerStoreLive =  new DatastoreWorker()
let kbidStoreLive
let libraryData = {}
const server = http.createServer((request, response) => {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
})

server.on('error', function(e) {
  console.log('problem with request: ' + e.stack);
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
  // listenr for data back from ECS
  liveSafeFLOW.on('displayEntity', (data) => {
    data.type = 'newEntity'
    connection.sendUTF(JSON.stringify(data))
  })
  liveSafeFLOW.on('displayEntityRange', (data) => {
    data.type = 'newEntityRange'
    connection.sendUTF(JSON.stringify(data))
  })
  liveSafeFLOW.on('displayUpdateEntity', (data) => {
    data.type = 'updateEntity'
    connection.sendUTF(JSON.stringify(data))
  })
  liveSafeFLOW.on('displayUpdateEntityRange', (data) => {
    data.type = 'updateEntityRange'
    connection.sendUTF(JSON.stringify(data))
  })
  liveSafeFLOW.on('updateModule', (data) => {
    let moduleRefContract = liveLibrary.liveComposer.moduleComposer(data, 'update')
    const savedFeedback = peerStoreLive.peerStoreRefContract(moduleRefContract)
  })
  liveSafeFLOW.on('storePeerResults', (data) => {
    const savedFeedback = peerStoreLive.peerStoreResults(data)
  })
  liveSafeFLOW.on('kbledgerEntry', (data) => {
    const savedFeedback = peerStoreLive.peerKBLentry(data)
  })

  connection.on('message', async msg => {
    // kbidStoreLive = new KBIDstoreWorker(this.datastoreKBL)
    function callbackKey (data) {
      let pubkeyData = {}
      pubkeyData.type = 'publickey'
      pubkeyData.pubkey = data
      connection.sendUTF(JSON.stringify(pubkeyData))
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
      connection.sendUTF(JSON.stringify(libraryData))
    }
    function callbackPeer (err, data) {
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
      connection.sendUTF(JSON.stringify(libraryData))
    }
    // logic for incoming request flows
    if (msg.type === 'utf8') {
      const o = JSON.parse(msg.utf8Data)
      if (o.reftype.trim() === 'hello') {
        connection.sendUTF(JSON.stringify('talk to CALE'))
      } else if (o.reftype.trim() === 'ignore' && o.type.trim() === 'safeflow' ) {
        if (o.action === 'auth') {
          let authStatus = await liveSafeFLOW.networkAuthorisation(o.network, o.settings)
          // if verified then load starting experiments into ECS-safeFLOW
          connection.sendUTF(JSON.stringify(authStatus))
          // check the public network library
          peerStoreLive.peerRefContractReplicate('peer', callbacklibrary)
        } else if (o.action === 'networkexperiment') {
          // start gather data, perform compute, formatting etc.
          async function expCallback (err, data) {
            console.log(err)
            let matchContract = {}
            for (let ditem of data) {
              if (ditem === '1234' ) {
                matchContract = ditem
              }
            }
            let ecsData = await liveSafeFLOW.startFlow(matchContract)
            let summaryECS = {}
            summaryECS.type = 'ecssummary'
            summaryECS.data = ecsData
            connection.sendUTF(JSON.stringify(summaryECS))
          }
          // const experimentRefContract = peerStoreLive.getRefContract('experiment', o.data, expCallback)
          let ecsData = await liveSafeFLOW.startFlow(o.data)
          let summaryECS = {}
          summaryECS.type = 'ecssummary'
          summaryECS.data = ecsData
          connection.sendUTF(JSON.stringify(summaryECS))
        } else if (o.action === 'updatenetworkexperiment') {
          // update to existing live ECS entity
          let ecsDataUpdate = await liveSafeFLOW.startFlow(o.data)
        }
      } else if (o.type.trim() === 'library' ) {
        // library routing
        if (o.reftype.trim() === 'viewpublickey') {
          // two peer syncing reference contracts
          const pubkey = peerStoreLive.getPrivatekey(callbackKey)
        } else if (o.reftype.trim() === 'replicatekey') {
          // two peer syncing reference contracts
          const replicateStore = peerStoreLive.peerRefContractReplicate(o.publickey, callbacklibrary)
        } else if (o.reftype.trim() === 'publiclibrary') {
          peerStoreLive.libraryGETRefContracts('all', callbacklibrary)
        } else if (o.reftype.trim() === 'privatelibrary') {
          peerStoreLive.peerGETRefContracts('all', callbackPeer)
        } else if (o.reftype.trim() === 'datatype') {
          // query peer hypertrie for datatypes
          if (o.action === 'GET') {
            const datatypeList = peerStoreLive.libraryGETRefContracts('datatype', callbacklibrary)
          } else {
            // save a new refContract
            const newRefContract = o.refContract
            const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
            connection.sendUTF(JSON.stringify(savedFeedback))
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
          // query peer hypertrie for packaging
          if (o.action === 'GET') {
            // peerStoreLive.peerGETRefContracts('packaging', callback)
          } else {
            // save a new refContract
            const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
            connection.sendUTF(JSON.stringify(savedFeedback))
          }
        } else if (o.reftype.trim() === 'visualise') {
          // query peer hypertrie for packaging
          if (o.action === 'GET') {
            // peerStoreLive.peerGETRefContracts('visualise', callback)
          } else {
            // save a new refContract
            const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
            connection.sendUTF(JSON.stringify(savedFeedback))
          }
        } else if (o.reftype.trim() === 'experiment') {
          // query peer hypertrie for packaging
          if (o.action === 'GET') {
            // peerStoreLive.peerGETRefContracts('experiment', callback)
          } else {
            // save a new refContract
            const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
            connection.sendUTF(JSON.stringify(savedFeedback))
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
            connection.sendUTF(JSON.stringify(savedFeedback))
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
            connection.sendUTF(JSON.stringify(savedFeedback))
          }
        } else if (o.reftype.trim() === 'genesisexperiment') {
          let genesisRefContract = liveLibrary.liveComposer.experimentComposerGenesis(o.data)
          const savedFeedback = peerStoreLive.libraryStoreRefContract(genesisRefContract)
          connection.sendUTF(JSON.stringify(savedFeedback))
        } else if (o.reftype.trim() === 'kbid') {
          // query peer hypertrie for packaging
          if (o.action === 'GET') {
            kbidStoreLive.peerGETkbids('kbid', callback)
          } else {
            // save a new refContract
            const savedFeedback = kbidStoreLive.peerStoreKBIDentry(o)
            connection.sendUTF(JSON.stringify(savedFeedback))
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
          connection.sendUTF(JSON.stringify(joinExpDisplay))
        } else if (o.reftype.trim() === 'module') {
          // query peer hypertrie for packaging
          if (o.action === 'GET') {
            peerStoreLive.peerGETRefContracts('module', callback)
          } else {
            // save a new refContract
            const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
            connection.sendUTF(JSON.stringify(savedFeedback))
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
          connection.sendUTF(JSON.stringify(moduleTempData))
        } else if (o.reftype.trim() === 'newmodules') {
          let moduleRefContract = liveLibrary.liveComposer.moduleComposer(o.data, 'join')
          const savedFeedback = peerStoreLive.libraryStoreRefContract(moduleRefContract)
          connection.sendUTF(JSON.stringify(savedFeedback))
        }
      } else {
        console.log('nothing matched tell of that')
      }
    }
  })
  connection.on('close', connection => {
  })
  connection.on('error', connection => {
    console.log('socket eeeerrrorrrr')
  })
})

process.on('unhandledRejection', function(err) {
  console.log(err);
})
