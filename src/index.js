'use strict'
import { createServer } from 'https'
// import { createServer } from 'http'
import fs from 'fs'
import { WebSocketServer } from 'ws'
import LibComposer from 'librarycomposer'
import SafeFLOW from 'node-safeflow'
import DatastoreWorker from './peerStore.js'
import KBIDstoreWorker from './kbidStore.js'
import os from 'os'

let liveSafeFLOW = {}
let liveLibrary = {}
let peerStoreLive = {}
let libraryData = {}
let authLive = false

// https options for crypto
const options = {
  key: fs.readFileSync('src/key.pem'),
  cert: fs.readFileSync('src/cert.pem')
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
  console.log('listening on 9888')
})

const wsServer = new WebSocketServer({ server })
  // WebSocket server
  console.log('peer connected')
  wsServer.on('connection', function ws(ws) {
  // valid cloud access token?
  function setupAcount (state) {
    liveLibrary = new LibComposer()
    peerStoreLive =  new DatastoreWorker() // what PtoP infrastructure running on?  Safe Network, Hypercore? etc
    let kbidStoreLive // not in use
    liveSafeFLOW = new SafeFLOW()
    // let libraryData = {}
    // setup folders
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
    // listenr for data back from ECS
    liveSafeFLOW.on('displayEntity', (data) => {
      data.type = 'newEntity'
      ws.send(JSON.stringify(data))
    })
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
    liveSafeFLOW.on('checkPeerResults', (data) => {
      const matchResult = peerStoreLive.peerStoreCheckResults(data, resultsCallback)
    })
    liveSafeFLOW.on('kbledgerEntry', (data) => {
      const savedFeedback = peerStoreLive.peerKBLentry(data)
    })
    // put back key info
    function callbackKey (data) {
      let pubkeyData = {}
      pubkeyData.type = 'publickey'
      pubkeyData.pubkey = data
      ws.send(JSON.stringify(pubkeyData))
    }
    peerStoreLive.keyManagement(callbackKey)
    function callbacklibrary (err, data) {
      // pass to sort data into ref contract types
      // console.log('call back public library')
      // console.log(data)
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
    function callbackWarmPeers (data) {
      let peerNData = {}
      peerNData.type = 'warm-peers'
      peerNData.data = data
      ws.send(JSON.stringify(peerNData))
    }
    peerStoreLive.listWarmPeers(callbackWarmPeers, callbacklibrary)
  }
  // refresh peer connect settings
  function refreshPeerAccount () {
    console.log('refresh peer account')
    // listenr for data back from ECS
    function closeListen () {
      console.log('listening closed')
    }
    liveSafeFLOW.removeListener('displayEntity', closeListen)
    liveSafeFLOW.removeListener('displayEntityRange', closeListen)
    liveSafeFLOW.removeListener('displayUpdateEntity', closeListen)
    liveSafeFLOW.removeListener('displayUpdateEntityRange', closeListen)
    liveSafeFLOW.removeListener('updateModule', closeListen)
    liveSafeFLOW.removeListener('storePeerResults', closeListen)
    liveSafeFLOW.removeListener('checkPeerResults', closeListen)
    liveSafeFLOW.removeListener('kbledgerEntry', closeListen)

    liveSafeFLOW.on('displayEntity', (data) => {
      data.type = 'newEntity'
      ws.send(JSON.stringify(data))
    })
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
    liveSafeFLOW.on('checkPeerResults', (data) => {
      const matchResult = peerStoreLive.peerStoreCheckResults(data, resultsCallback)
    })
    liveSafeFLOW.on('kbledgerEntry', (data) => {
      const savedFeedback = peerStoreLive.peerKBLentry(data)
    })
    // put back key info
    function callbackKey (data) {
      let pubkeyData = {}
      pubkeyData.type = 'publickey'
      pubkeyData.pubkey = data
      ws.send(JSON.stringify(pubkeyData))
    }
    peerStoreLive.keyManagement(callbackKey)
    function callbacklibrary (err, data) {
      // pass to sort data into ref contract types
      // console.log('call back public library')
      // console.log(data)
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
    function callbackWarmPeers (data) {
      let peerNData = {}
      peerNData.type = 'warm-peers'
      peerNData.data = data
      ws.send(JSON.stringify(peerNData))
    }
    peerStoreLive.listWarmPeers(callbackWarmPeers, callbacklibrary)
    peerStoreLive.libraryGETRefContracts('all', callbacklibrary)
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
      ws.send(JSON.stringify(libraryData))
    }
    peerStoreLive.peerGETRefContracts('all', callbackPeer)
  }
  // call back from results etc needing to get back to safeFLOW-ecs
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

  ws.on('message', async msg => {
    /* function callbackKey (data) {
      let pubkeyData = {}
      pubkeyData.type = 'publickey'
      pubkeyData.pubkey = data
      ws.send(JSON.stringify(pubkeyData))
    } */
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
    /* function callbackWarmPeers (data) {
      let peerNData = {}
      peerNData.type = 'warm-peers'
      peerNData.data = data
      ws.send(JSON.stringify(peerNData))
    } */
    function callbacklibrary (err, data) {
      // pass to sort data into ref contract types
      // console.log('call back public library')
      // console.log(data)
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
      ws.send(JSON.stringify(libraryData))
    }
    // logic for incoming request flows
    const o = JSON.parse(msg)
    if (o.reftype.trim() === 'hello') {
      ws.send(JSON.stringify('talk to CALE'))
    } else if (o.reftype.trim() === 'cloud') {
      // valid cloud token
      console.log('cloud auth check')
      let validToken = ''
      if (validToken === true) {
        let setupBefore = Object.keys(this.peerStoreLive.datastorePeers)
        console.log('existing status of datastaore')
        console.log(setupBefore)
        if (setupBefore.length === 0) {
          setupAcount()
        } else {
          console.log('datastore already setup')
        }
      } else {
        console.log('not a valid token')
      }
    } else if (o.reftype.trim() === 'ignore' && o.type.trim() === 'safeflow' ) {
      if (o.action === 'auth') {
        // secure connect to safeFLOW
        console.log('safeFLOW auth start')
        let validToken = '123'
        if (validToken === o.cloudtoken) {
          // set access to safeFLOW
          authLive = true
          let setupBefore = []
          if (peerStoreLive !== undefined) {
            if (peerStoreLive.datastorePeers !== undefined) {
              setupBefore = Object.keys(peerStoreLive.datastorePeers)
              console.log('setup before????')
              console.log(setupBefore.length)
            } else {
              console.log('else after exist')
            }
          } else {
            console.log('lsat lgics')
          }
          if (setupBefore.length === 0) {
            setupAcount('genesis')
            let authStatus = await liveSafeFLOW.networkAuthorisation(o.settings)
            // if verified then load starting experiments into ECS-safeFLOW
            ws.send(JSON.stringify(authStatus))
          } else {
            // need to start library data back again
            console.log('refresh start data for toolit')
            refreshPeerAccount()
            // setupAcount('live')
            let authStatus = await liveSafeFLOW.networkAuthorisation(o.settings)
            let setupStatus = {}
            setupStatus.type = 'authconfirm'
            setupStatus.data = true
            ws.send(JSON.stringify(setupStatus))
          }
        } else {
          let tokenMessage = {}
          tokenMessage.type = 'cloudtoken'
          tokenMessage.data = false
          ws.send(JSON.stringify(tokenMessage))
        }
      } else if (o.action === 'datastoreauth' && authLive === true) {
          console.log('auth datastore(s)')
          let datastoreStatus = await liveSafeFLOW.datastoreAuthorisation(o.settings)
          // if verified then load starting experiments into ECS-safeFLOW
          ws.send(JSON.stringify(datastoreStatus))
          // check the public network library
          // peerStoreLive.peerRefContractReplicate('peer', callbacklibrary)
      } else if (o.action === 'disconnect') {
        console.log('session socket ended')
        authLive = false
        // peerStoreLive.closeDatastores()
        /* liveSafeFLOW = {}
        liveLibrary = {}
        peerStoreLive = {}
        libraryData = {} */
        // process.exit(0)
      } else if (o.action === 'networkexperiment' && authLive === true) {
        // start gather data, perform compute, formatting etc.
        async function expCallback (err, data) {
          console.log(err)
          // console.log('network experiment DATA')
          // console.log(data)
          let matchContract = {}
          for (let ditem of data) {
            if (ditem === '1234' ) {
              matchContract = ditem
            }
          }
          // console.log(matchContract)
          let ecsData = await liveSafeFLOW.startFlow(matchContract)
          let summaryECS = {}
          summaryECS.type = 'ecssummary'
          summaryECS.data = ecsData
          ws.send(JSON.stringify(summaryECS))
        }
        // const experimentRefContract = peerStoreLive.getRefContract('experiment', o.data, expCallback)
        let ecsData = await liveSafeFLOW.startFlow(o.data)
        let summaryECS = {}
        summaryECS.type = 'ecssummary'
        summaryECS.data = ecsData
        ws.send(JSON.stringify(summaryECS))
      } else if (o.action === 'updatenetworkexperiment') {
        // update to existing live ECS entity
        let ecsDataUpdate = await liveSafeFLOW.startFlow(o.data)
      }
    } else if (o.type.trim() === 'library' && authLive === true) {
      // library routing
      if (o.reftype.trim() === 'viewpublickey' && authLive === true) {
        // two peer syncing reference contracts
        const pubkey = peerStoreLive.singlePublicKey('', callbackKey)
      } else if (o.reftype.trim() === 'openlibrary' && authLive === true) {
        // two peer syncing reference contracts
        const pubkey = peerStoreLive.openLibrary(o.data, callbackOpenLibrary)
      } else if (o.reftype.trim() === 'keymanagement' && authLive === true) {
        peerStoreLive.keyManagement(callbackKey)
      } else if (o.reftype.trim() === 'peer-add' && authLive === true) {
        peerStoreLive.addPeer(o.data, callbackPeerNetwork)
      } else if (o.reftype.trim() === 'warm-peers' && authLive === true) {
        peerStoreLive.listWarmPeers(callbackWarmPeers, callbacklibrary)
      } else if (o.reftype.trim() === 'replicatekey' && authLive === true) {
        // two peer syncing reference contracts
        const replicateStore = peerStoreLive.peerRefContractReplicate(o.publickey, callbacklibrary)
      } else if (o.reftype.trim() === 'publiclibrary' && authLive === true) {
        console.log('public library')
        peerStoreLive.libraryGETRefContracts('all', callbacklibrary)
      } else if (o.reftype.trim() === 'privatelibrary' && authLive === true) {
        peerStoreLive.peerGETRefContracts('all', callbackPeer)
      } else if (o.reftype.trim() === 'datatype' && authLive === true) {
        // query peer hypertrie for datatypes
        if (o.action === 'GET') {
          const datatypeList = peerStoreLive.libraryGETRefContracts('datatype', callbacklibrary)
        } else {
          // save a new refContract
          const newRefContract = o.refContract
          const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
          ws.send(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'compute' && authLive === true) {
        // query peer hypertrie for datatypes
        if (o.action === 'GET') {
          // peerStoreLive.peerGETRefContracts('compute', callback)
        } else {
          // save a new refContract
          peerStoreLive.libraryStoreRefContract(o)
        }
      } else if (o.reftype.trim() === 'units' && authLive === true) {
        // query peer hypertrie for Units
        if (o.action === 'GET') {
          // peerStoreLive.peerGETRefContracts('units', callback)
        } else {
          // save a new refContract
          peerStoreLive.libraryStoreRefContract(o)
        }
      } else if (o.reftype.trim() === 'packaging' && authLive === true) {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          // peerStoreLive.peerGETRefContracts('packaging', callback)
        } else {
          // save a new refContract
          const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
          ws.send(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'visualise' && authLive === true) {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          // peerStoreLive.peerGETRefContracts('visualise', callback)
        } else {
          // save a new refContract
          const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
          ws.send(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'experiment' && authLive === true) {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          // peerStoreLive.peerGETRefContracts('experiment', callback)
        } else {
          // save a new refContract
          const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
          ws.send(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'newexperimentmodule' && authLive === true) {
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
      } else if (o.reftype.trim() === 'joinexperiment' && authLive === true) {
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
      } else if (o.reftype.trim() === 'genesisexperiment' && authLive === true) {
        let genesisRefContract = liveLibrary.liveComposer.experimentComposerGenesis(o.data)
        const savedFeedback = peerStoreLive.libraryStoreRefContract(genesisRefContract)
        ws.send(JSON.stringify(savedFeedback))
      } else if (o.reftype.trim() === 'kbid') {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          kbidStoreLive.peerGETkbids('kbid', callback)
        } else {
          // save a new refContract
          const savedFeedback = kbidStoreLive.peerStoreKBIDentry(o)
          ws.send(JSON.stringify(savedFeedback))
        }
      } else if (o.action === 'extractexperimentmodules' && authLive === true) {
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
      } else if (o.reftype.trim() === 'module' && authLive === true) {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          peerStoreLive.peerGETRefContracts('module', callback)
        } else {
          // save a new refContract
          const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
          ws.send(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'moduletemp' && authLive === true) {
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
      } else if (o.reftype.trim() === 'newmodules' && authLive === true) {
        let moduleRefContract = liveLibrary.liveComposer.moduleComposer(o.data, 'join')
        const savedFeedback = peerStoreLive.libraryStoreRefContract(moduleRefContract)
        ws.send(JSON.stringify(savedFeedback))
      }
    } else {
      console.log('nothing matched tell of that')
    }
  })
  ws.on('close', ws => {
    console.log('close ws')
    // process.exit(0)
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
