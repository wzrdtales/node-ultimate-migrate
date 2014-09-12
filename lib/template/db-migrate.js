var mariasql = require('mariasql');
var log = require('db-migrate/lib/log');
var util = require('util');
var deasync = require('deasync');

function MigrationBuilder()
{
   this.migrationTemplate = [
     "var dbm = require('db-migrate');\nvar type = dbm.dataType;}\n\nexports.up = function(db, callback) {\n",
     "};\n\nexports.down = function(db, callback) {\n",
     "};\n"
   ];
}

MigrationBuilder.prototype = {

};



exports.connect = function(config, callback) {
   callback( null, new MigrationBuilder() );
};