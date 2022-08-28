'use strict'
import atob from 'atob'

/**
*  FileParser
*
*
* @class FileParser
* @package    network library
* @copyright  Copyright (c) 2022 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/

import fs from 'fs'
import os from 'os'
import util from 'util'
import events from 'events'
import axios from 'axios'
import csv from 'csv-parser'
import crypto from 'crypto'

var FileParser = function (path) {
  events.EventEmitter.call(this)
  this.storepath = path
}

/**
* inherits core emitter class within this class
* @method inherits
*/
util.inherits(FileParser, events.EventEmitter)

/**
* local json file extract header for auto complete
* @method
*
*/
FileParser.prototype.localJSONfile = async function (o, ws) {
  let headerSet = this.extractJSONkeys(o)
  // data back to peer
  let fileFeedback = {}
  fileFeedback.success = true
  fileFeedback.path = this.storepath + '/json/' + o.data.name + '.json'
  fileFeedback.columns = headerSet
  let storeFeedback = {}
  storeFeedback.type = 'file-save'
  storeFeedback.action = 'library'
  storeFeedback.data = fileFeedback
  ws.send(JSON.stringify(storeFeedback))
}


/**
* web json file for saving
* @method webJSONfile
*
*/
FileParser.prototype.webJSONfile = async function (o, ws) {
  // then prepare file for HOP i.e. convert to json
  const lines = JSON.parse(reader.result)
  localthis.linesLimit = lines
  // data back to peer
  /* let fileFeedback = {}
  fileFeedback.success = true
  fileFeedback.path = this.storepath + '/json/' + fileName + '.json'
  fileFeedback.columns = headerSet.splitwords
  let storeFeedback = {}
  storeFeedback.type = 'json-file-save'
  storeFeedback.action = 'library'
  storeFeedback.data = fileFeedback
  ws.send(JSON.stringify(storeFeedback)) */
}

/**
* local file parser save etc
* @method localFileParse
*
*/
FileParser.prototype.localFileParse = async function (o, ws) {
  // then prepare file for HOP i.e. convert to json
  // file input management
  // extract out the headers name for columns
  let headerSet = this.extractCSVHeaderInfo(o)
  console.log('header set')
  console.log(headerSet)
  // protocol should be to save original file
  let newPathFile = this.saveOriginalProtocol(o)
  //  csv to JSON convertion and save into HOP
  // const praser = readStream(newPathcsv, headerSet, delimiter, dataline)
  const parser = await this.readFileStream(newPathFile, headerSet)
  this.convertJSON(o, headerSet, parser, 'local', null)
}

/**
* files from cloud
* @method webFileParse
*
*/
FileParser.prototype.webFileParse = async function (o, ws) {
  const localthis = this
  let dataWeb = await axios.get(o.data.websource)
    .catch(function (error) {
        // handle error
        console.log(error)
      })
  const dataSource = dataWeb.data
  let lcounter = 0
  let match = []
  dataSource.split(/\r\n|\n/).forEach(line =>  {
    lcounter++
    if (lcounter === (parseInt(o.data.info.cnumber) +1 )) {
      match = line
    }
  })
  // create new file name hash of source url
  const hashURL = crypto.createHash('sha256').update(o.data.websource).digest('hex')
  const fileNewName = hashURL + '.csv'
  // localthis.linesLimit = lines.slice(0, 30)
  let headerInfo = localthis.extractCSVheaders(o, match)
  let newPathFile = localthis.saveOriginalProtocolWeb(o, dataSource, fileNewName)
  const praser = await localthis.readFileStream(newPathFile, headerInfo)
  this.convertJSON(o, ws, headerInfo, praser, 'web', fileNewName)
}

/**
* read csv headers and extract info
* @method extractCSVHeaderInfo
*
*/
FileParser.prototype.extractCSVHeaderInfo = function (o) {
  let match = ''
  let lcounter = 0
  // if local peer setup then file path is available
  if (o.data.web === 'weblocal') {
    const dataURI = o.data.path
    const dataCSV = atob(dataURI.split(',')[1]);
    dataCSV.split(/\r?\n/).forEach(line =>  {
      lcounter++
      if (lcounter === (parseInt(o.data.info.cnumber) +1 )) {
        match = line
      }
    })
  } else {
    // let filePathCSV = fs.existsSync(os.homedir() + this.storepath + '/csv/') + o.data.name
    const allFileContents = fs.readFileSync(filePathCSV, 'utf-8')
    allFileContents.split(/\r?\n/).forEach(line =>  {
      lcounter++
      if (lcounter === (parseInt(o.data.info.cnumber) +1 )) {
        match = line
      }
    })
  }
  let headerInfo = this.extractCSVheaders(o, match)
  return headerInfo
}

/**
* read JSON row and extact keys
* @method extractJSONkeys
*
*/
FileParser.prototype.extractJSONkeys = function (o) {
  let jsonKeys = []
  // if local peer setup then file path is available
  if (o.data.web === 'weblocal') {
    const dataURI = o.data.path
    const dataCSV = atob(dataURI.split(',')[1])
    const toJSON = JSON.parse(dataCSV)
    jsonKeys = Object.keys(toJSON[0])
  } else {
    // let filePathCSV = fs.existsSync(os.homedir() + this.storepath + '/csv/') + o.data.name
    const allFileContents = fs.readFileSync(filePathCSV, 'utf-8')
    allFileContents.split(/\r?\n/).forEach(line =>  {
      lcounter++
      if (lcounter === (parseInt(o.data.info.cnumber) +1 )) {
        jsonKeys = line
      }
    })
  }
  return jsonKeys
}

/**
*
* @method extractCSVheaders
*
*/
FileParser.prototype.extractCSVheaders = function (o, lineData) {
  console.log(lineData)
  let delimiter = ''
  if (o.data.info.delimiter === 'tab') {
    delimiter = "\t"
  } else if (o.data.info.delimiter === ';') {
    delimiter = ";"
  } else {
    delimiter = ","
  }
  let splitWords = lineData.split(delimiter)
  const headerSet = splitWords
  let dataline = parseInt(o.data.info.dataline)

  let headerInfo = {}
  headerInfo.headerset = headerSet
  headerInfo.splitwords = splitWords
  headerInfo.delimiter = delimiter
  headerInfo.dataline = dataline
  return headerInfo
}

/**
*
* @method readFileStream
*
*/
FileParser.prototype.readFileStream = async function (fpath, headerSet) {
  // function readStream (fpath, headerSet, delimiter, startno) {
  return new Promise((resolve, reject) => {
    const results = []
    fs.createReadStream(fpath)
      .pipe(csv({ headers: headerSet.headerset, separator: headerSet.delimiter, skipLines: headerSet.dataline }))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results)
      })
  })
}

/**
*
* @method convertJSON
*
*/
FileParser.prototype.convertJSON = function (o, headerSet, results, source, newFilename) {
  const localthis = this
  // console.log('convert json')
  // console.log(results)
  let fileName = ''
  if (source !== 'web') {
    fileName = o.data.name
  } else {
    fileName = newFilename
  }
  const datacolumn = o.data.info.datename
  const flowList = []
  for (const rs of results) {
    const dateFormat = new Date(rs[datacolumn])
    const msDate = dateFormat.getTime()
    rs[datacolumn] = msDate / 1000
    flowList.push(rs)
  }
  const jsonFlow = JSON.stringify(flowList)
  let fileJSONbundle = {}
  fileJSONbundle.path = 'json'
  fileJSONbundle.name = fileName + '.json'
  fileJSONbundle.data = jsonFlow
  return fileJSONbundle
  // do via hyperspace protocol now
  /* 
  fs.writeFile(os.homedir() + localthis.storepath + '/json/' + fileName + '.json', jsonFlow, 'utf8', function (err) {
    if (err) {
      console.log('An error occured while writing JSON Object to File.')
      return console.log(err)
    }
    // data back to peer
    let fileFeedback = {}
    fileFeedback.success = true
    fileFeedback.path = localthis.storepath + '/json/' + fileName + '.json'
    fileFeedback.columns = headerSet.splitwords
    let storeFeedback = {}
    storeFeedback.type = 'file-save'
    storeFeedback.action = 'library'
    storeFeedback.data = fileFeedback
    return storeFeedback
    // ws.send(JSON.stringify(storeFeedback))
  }) */
}

/**
* data protocol save
* @method saveFileProtocol
*
*/
FileParser.prototype.saveFileProtocol = function (o) {
  console.log('return to hyperspace protocol')
}


/**
* keep copy of source entering network library
* @method saveOriginalProtocol
*
*/
FileParser.prototype.saveOriginalProtocol = function (o) {
  // protocol should be to save original file to safeNetwork / IPFS etc. peers choice
  let newPathcsv = os.homedir() + this.storepath + '/csv/' + o.data.name
  if (o.data.web === 'weblocal') {
    const dataURI = o.data.path
    const dataCSV = atob(dataURI.split(',')[1])
    fs.writeFile(newPathcsv, dataCSV, function (err, data) {
      if (err) {
        return console.log(err)
      }
    })
  } else {
    fs.rename(o.data.path, newPathcsv, function (err) {
      if (err) throw err
      console.log('File Renamed.')
    })
  }
  return newPathcsv
}

/**
* keep copy of source entering network library from web
* @method saveOriginalProtocolWeb
*
*/
FileParser.prototype.saveOriginalProtocolWeb = function (o, data, fileNewName) {
  // protocol should be to save original file to safeNetwork / IPFS etc. peers choice
  let newPathcsv = os.homedir() + this.storepath + '/csv/' + fileNewName
  fs.writeFile(newPathcsv, data, function (err, data) {
    if (err) {
      return console.log(err)
    }
  })
  return newPathcsv
}

export default FileParser
