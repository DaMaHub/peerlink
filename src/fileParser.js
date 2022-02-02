'use strict'
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

var FileParser = function () {
  events.EventEmitter.call(this)
}

/**
* inherits core emitter class within this class
* @method inherits
*/
util.inherits(FileParser, events.EventEmitter)

/**
* local file parser save etc
* @method localFileParse
*
*/
FileParser.prototype.localFileParse = async function (o, ws) {
  console.log('local files')
  // then prepare file for HOP i.e. convert to json
  // file input management
  // extract out the headers name for columns
  let headerSet = this.extractCSVHeaderInfo(o)
  /* let match = ''
  let lcounter = 0
  const allFileContents = fs.readFileSync(o.data.path, 'utf-8')
  allFileContents.split(/\r?\n/).forEach(line =>  {
    lcounter++
    if (lcounter === (parseInt(o.data.info.cnumber) +1 )) {
      match = line
    }
  }) */

  /* let delimiter = ''
  if (o.data.info.delimiter === 'tab') {
    delimiter = "\t"
  } else {
    delimiter = ","
  }
  let splitWords = match.split(delimiter)
  const headerSet = splitWords */

  /* function readStream (fpath, headerSet, delimiter, startno) {
    return new Promise((resolve, reject) => {
      const results = []
      fs.createReadStream(fpath)
        .pipe(csv({ headers: headerSet, separator: delimiter, skipLines: startno }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve(results)
        })
    })
  } */

  /* function jsonConvert (results) {
    const flowList = []
    for (const rs of results) {
      // console.log(rs)
      const dateFormat = new Date(rs.datetime)
      const msDate = dateFormat.getTime()
      rs.datetime = msDate / 1000
      flowList.push(rs)
    }
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
  } */
  // protocol should be to save original file to safeNetwork / IPFS etc. peers choice
  let newPathFile = this.saveOriginalProtocol(o)
  /* let newPathcsv = os.homedir() + '/peerlink/csv/' + o.data.name
  fs.rename(o.data.path, newPathcsv, function (err) {
    if (err) throw err
    console.log('File Renamed.')
  }); */
  //  csv to JSON convertion and save into HOP
  // const praser = readStream(newPathcsv, headerSet, delimiter, dataline)
  const praser = await this.readFileStream(newPathFile, headerSet)
  this.convertJSON(o, ws, headerSet, praser)
  // praser.then(console.log('finshed'))
  // praser.then(
    // console.log(result)
    // result => jsonConvert(result), // shows "done!" after 1 second
    //error => console.log(error) // doesn't run
  // )
}

/**
* files from cloud
* @method webFileParse
*
*/
FileParser.prototype.webFileParse = function (o, ws) {
  console.log('web files')
  console.log(o)
  const localthis = this
  axios.get(o.data.websource)
    .then(function (response) {
      // handle success
      // console.log(Object.keys(response))
      // console.log(response.data)
      const dataSource = response.data
      const lines = dataSource.split(/\r\n|\n/)
      console.log(lines.length)
      // localthis.linesLimit = lines.slice(0, 30)
    })
    .catch(function (error) {
      // handle error
      console.log(error)
    })
    .then(function () {
      // always executed
    })
}

/**
* read csv headers and extract info
* @method extractCSVHeaderInfo
*
*/
FileParser.prototype.extractCSVHeaderInfo = function (o) {
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
FileParser.prototype.readFileStream = async function (fpath, headerSet, delimiter, startno) {
  // function readStream (fpath, headerSet, delimiter, startno) {
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

/**
*
* @method convertJSON
*
*/
FileParser.prototype.convertJSON = function (o, ws, headerSet, results) {
  //function jsonConvert (results) {
  const flowList = []
  for (const rs of results) {
    // console.log(rs)
    const dateFormat = new Date(rs.datetime)
    const msDate = dateFormat.getTime()
    rs.datetime = msDate / 1000
    flowList.push(rs)
  }
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
    fileFeedback.columns = headerSet.splitwords
    let storeFeedback = {}
    storeFeedback.type = 'file-save'
    storeFeedback.action = 'library'
    storeFeedback.data = fileFeedback
    ws.send(JSON.stringify(storeFeedback))
  })
}

/**
* keep copy of source entering network library
* @method saveOriginalProtocol
*
*/
FileParser.prototype.saveOriginalProtocol = function (o) {
  // protocol should be to save original file to safeNetwork / IPFS etc. peers choice
  let newPathcsv = os.homedir() + '/peerlink/csv/' + o.data.name
  fs.rename(o.data.path, newPathcsv, function (err) {
    if (err) throw err
    console.log('File Renamed.')
  })
  return newPathcsv
}

export default FileParser
