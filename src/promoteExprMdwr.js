/*
 Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U

 This file is part of PopBox.

 PopBox is free software: you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free
 Software Foundation, either version 3 of the License, or (at your option) any
 later version.
 PopBox is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or
 FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
 License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with PopBox. If not, seehttp://www.gnu.org/licenses/.

 For those usages not covered by the GNU Affero General Public License
 please contact with::dtc_support@tid.es
 */


var config = require('./config.js');
var dbCluster = require('./DBCluster.js');

var amISlave = config.slave;
function checkAndPromote() {
  'use strict';
  return function (req, res, next) {
    if(amISlave){
      dbCluster.promoteMaster();
      amISlave = false;
    }
    next();
  };
}

exports.checkAndPromote = checkAndPromote;