'use strict'
import { createServer } from 'https'
// import { createServer } from 'http'
import fs from 'fs'
import { WebSocketServer } from 'ws'
import CaleAi from 'cale-holism'
import LibComposer from 'librarycomposer'
import SafeFLOW from 'node-safeflow'
import DatastoreWorker from './peerStore.js'
import KBIDstoreWorker from './kbidStore.js'
import os from 'os'
import csv from 'csv-parser'
import csvHeaders from 'csv-headers'

const liveCALEAI = new CaleAi()
const liveLibrary = new LibComposer()
let peerStoreLive =  new DatastoreWorker() // what PtoP infrastructure running on?  Safe Network, Hypercore? etc
let kbidStoreLive // not in use
const liveSafeFLOW = new SafeFLOW()
let libraryData = {}

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
  console.log('listening on *:9888')
})

const wsServer = new WebSocketServer({ server })

/*
wsServer.on('ws', function ws(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message)
    ws.send('thank you for the message')
  })
  let firstContact = {}
  firstContact.data = 'peerconnectlive'
  ws.send(JSON.stringify(firstContact))
})
*/
// WebSocket server
wsServer.on('connection', function ws(ws) {
// wsServer.on('request', request => {
  // let ws = request.accept(null, request.origin)
  console.log('peer connected websocket')
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

  ws.on('message', async msg => {
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
    function callbackLifeboard (err, data) {
      // pass to sort data into ref contract types
      let libraryData = {}
      libraryData.data = 'contracts'
      libraryData.type = 'peerlifeboard'
      libraryData.lifeboard = data
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
    console.log('input')
    console.log(o)
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
        console.log('auth start')
        let authStatus = await liveSafeFLOW.networkAuthorisation(o.settings)
        // OK with safeFLOW setup then bring peerDatastores to life
        peerStoreLive.setupDatastores()
        ws.send(JSON.stringify(authStatus))
      } else if (o.action === 'dataAPIauth') {
          console.log('auth APIS third party datastore(s)')
          let datastoreStatus = await liveSafeFLOW.datastoreAuthorisation(o.settings)
          // if verified then load starting experiments into ECS-safeFLOW
          ws.send(JSON.stringify(datastoreStatus))
          // check the public network library
          // peerStoreLive.peerRefContractReplicate('peer', callbacklibrary)
      } else if (o.action === 'disconnect') {
        process.exit(0)
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
      // library routing
      if (o.reftype.trim() === 'convert-csv-json') {
        // save protocol original file save and JSON for HOP
        // then prepare file for HOP i.e. convert to json
        // file input management
        console.log('line info')
        console.log(o.data.info)
        // extract out the headers name for columns
        let match = ''
        let lcounter = 0
        const allFileContents = fs.readFileSync(o.data.path, 'utf-8')
        allFileContents.split(/\r?\n/).forEach(line =>  {
          lcounter++
          if (lcounter === (parseInt(o.data.info.cnumber) +1 )) {
            match = line
          }
        })
        let delimiter = ''
        if (o.data.info.delimiter === 'tab') {
          delimiter = "\t"
        } else {
          delimiter = ","
        }
        let splitWords = match.split(delimiter)
        const headerSet = splitWords // ['agency_cd', 'site_no', 'datetime', 'tz_cd', '16643_00065', '16643_00065_cd']
        /* const reader = new FileReader()
        reader.onloadend = function () {
          // const fileData = reader.result
          const lines = reader.result.split(/\r\n|\n/)
          let lcounter = 0
          for (let li of lines) {
            lcounter++
            if (lcounter === o.data.info.cnumber) {
              console.log('line number match')
              console.log(li)
            }
          }
        } */
        // reader.readAsText(o.data.path)

        function readStream (fpath, headerSet, delimiter, startno) {
          return new Promise((resolve, reject) => {
            const results = []
            fs.createReadStream(fpath)
              .pipe(csv({ headers: headerSet, separator: delimiter, skipLines: startno }))
              .on('data', (data) => results.push(data))
              .on('end', () => {
                resolve(results)
              })
          })
        }

        function jsonConvert (results) {
          console.log('segment out by category')
          const flowList = []
          for (const rs of results) {
            // console.log(rs)
            const dateFormat = new Date(rs.datetime)
            const msDate = dateFormat.getTime()
            rs.datetime = msDate / 1000
            flowList.push(rs)
          }
          console.log('parse out JSON')
          const jsonFlow = JSON.stringify(flowList)
          // console.log(jsonFlow)
          fs.writeFile(os.homedir() + '/peerlink/json/' + o.data.name + '.json', jsonFlow, 'utf8', function (err) {
            if (err) {
              console.log('An error occured while writing JSON Object to File.')
              return console.log(err)
            }
            console.log('JSON file has been saved.')
            // data back to peer
            let fileFeedback = {}
            fileFeedback.success = true
            fileFeedback.path = '/peerlink/json/' + o.data.name + '.json'
            fileFeedback.columns = headerSet
            let storeFeedback = {}
            storeFeedback.type = 'file-save'
            storeFeedback.action = 'library'
            storeFeedback.data = fileFeedback
            ws.send(JSON.stringify(storeFeedback))
          })
        }
        // protocol should be to save original file to safeNetwork / IPFS etc. peers choice
        let newPathcsv = os.homedir() + '/peerlink/csv/' + o.data.name
        fs.rename(o.data.path, newPathcsv, function (err) {
          if (err) throw err;
          console.log('File Renamed.');
        });
        //  csv to JSON convertion and save into HOP
        let dataline = parseInt(o.data.info.dataline)
        const praser = readStream(newPathcsv, headerSet, delimiter, dataline)
        praser.then(console.log('finshed'))
        praser.then(
          // console.log(result)
          result => jsonConvert(result), // shows "done!" after 1 second
          error => console.log(error) // doesn't run
        )
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
      } else if (o.reftype.trim() === 'replicatekey') {
        // two peer syncing reference contracts
        const replicateStore = peerStoreLive.peerRefContractReplicate(o.publickey, callbacklibrary)
      } else if (o.reftype.trim() === 'publiclibrary') {
        // console.log('public library')
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
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          // peerStoreLive.peerGETRefContracts('packaging', callback)
        } else {
          // save a new refContract
          const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
          ws.send(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'visualise') {
        // query peer hypertrie for packaging
        if (o.action === 'GET') {
          // peerStoreLive.peerGETRefContracts('visualise', callback)
        } else {
          // save a new refContract
          const savedFeedback = peerStoreLive.libraryStoreRefContract(o)
          ws.send(JSON.stringify(savedFeedback))
        }
      } else if (o.reftype.trim() === 'experiment') {
        // query peer hypertrie for packaging
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
        // query peer hypertrie for packaging
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
        // query peer hypertrie for packaging
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
        console.log('new lifeboard ref cont to create')
        let lifeboardRefContract = liveLibrary.liveComposer.lifeboardComposer(o.data, 'new')
        const saveLB = peerStoreLive.lifeboardStoreRefContract(lifeboardRefContract)
        ws.send(JSON.stringify(saveLB))
      } else if (o.reftype.trim() === 'addlifeboard') {
        console.log('add link to master lifebarod ref contract')
        let lifeboardMember = liveLibrary.liveComposer.lifeboardComposer(o.data, 'member')
        const saveLBmember = peerStoreLive.lifeboardStoreRefContract(lifeboardMember)
        ws.send(JSON.stringify(saveLBmember))
      } else if (o.reftype.trim() === 'peerLifeboard') {
        peerStoreLive.peerGETLifeboards('all', callbackLifeboard)
      } else {
        console.log('network library no match')
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
