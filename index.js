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
let libraryData = {}
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
      // console.log(data)
      console.log(err)
      // pass to sort data into ref contract types
      libraryData.data = 'contracts'
      const segmentedRefContracts = liveLibrary.liveLibraryLib.refcontractSperate(data)
      libraryData.referenceContracts = segmentedRefContracts
      // need to split for genesis and peer joined NXPs
      const nxpSplit = liveLibrary.liveLibraryLib.experimentSplit(segmentedRefContracts.experiment)
      libraryData.splitExperiments = nxpSplit
      // look up modules for this experiments
      libraryData.networkExpModules = liveLibrary.liveLibraryLib.expMatchModuleGenesis(libraryData.referenceContracts.module, nxpSplit.genesis)
      libraryData.networkPeerExpModules = liveLibrary.liveLibraryLib.expMatchModuleJoined(libraryData.referenceContracts.module, nxpSplit.joined)
      connection.sendUTF(JSON.stringify(libraryData))
    }
    // logic for incoming request flows
    if (msg.type === 'utf8') {
      const o = JSON.parse(msg.utf8Data)
      console.log('--incoming message-----')
      console.log(o)
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
        } else if (o.reftype.trim() === 'newexperimentmodule') {
          // a new genesis network experiment to store to network library
          let moduleGenesisList = []
          let moduleGenesisExpanded = []
          let newModCount = o.data.length
          for (let mh of o.data) {
            const moduleRefContract = liveLibrary.liveComposer.moduleComposer(mh, '')
            const moduleRefContractReady = JSON.stringify(moduleRefContract)
            const savedFeedback = peerStoreLive.peerStoreRefContract(moduleRefContract)
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
            const savedFeedback = peerStoreLive.peerStoreRefContract(genesisRefContract)
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
            if (mh.value.concept.moduleinfo.name === 'question') {
              peerModules.type = 'question'
              peerModules.question = mh.value.concept.question
            } else if (mh.value.concept.moduleinfo.name === 'data') {
              peerModules.type = 'data'
              peerModules.data = o.data.options.data
            } else if (mh.value.concept.moduleinfo.name === 'compute') {
              peerModules.type = 'compute'
              peerModules.compute = mh.value.concept.refcont
              peerModules.controls = o.data.options.compute
              peerModules.settings = o.data.options.visualise
            } else if (mh.value.concept.moduleinfo.name === 'visualise') {
              peerModules.type = 'visualise'
              peerModules.visualise = mh.value.concept.refcont
            }
            let moduleRefContract = liveLibrary.liveComposer.moduleComposer(peerModules, 'join')
            const savedFeedback = peerStoreLive.peerStoreRefContract(moduleRefContract)
            moduleJoinedList.push(savedFeedback.key)
            moduleJoinedExpanded.push(savedFeedback.contract)
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
          const savedFeedback = peerStoreLive.peerStoreRefContract(genesisRefContract)
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
          joinExpDisplay.data = liveLibrary.liveLibraryLib.extractData(o.data.modules, 'data')
          joinExpDisplay.compute = liveLibrary.liveLibraryLib.extractCompute(o.data.modules, 'compute')
          joinExpDisplay.visualise = liveLibrary.liveLibraryLib.extractVisualise(o.data.modules, 'visualise')
          // look up option contracts for each ref contract type
          let dataOptions = []
          for (let optionD of joinExpDisplay.data) {
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
        } else if (o.reftype.trim() === 'module') {
          // query peer hypertrie for packaging
          if (o.action === 'GET') {
            peerStoreLive.peerGETRefContracts('module', callback)
          } else {
            // save a new refContract
            const savedFeedback = peerStoreLive.peerStoreRefContract(o)
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
          const savedFeedback = peerStoreLive.peerStoreRefContract(moduleRefContract)
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
