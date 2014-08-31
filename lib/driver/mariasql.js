var mariasql = require('mariasql');
var log = require('db-migrate/lib/log');
var util = require('util');
var deasync = require('deasync');

function MariasqlDriver( connection )
{
   this.connection = connection;
}

MariasqlDriver.prototype = {

   getTables: function( config, callback )
   {
      var self = this;
      var db = Array(), diff = Array(), first = true;
      var query = util.format('USE %s; SHOW TABLES', config.database);
         this.runSql( query, true )
            .on( 'result', function( res )
            {
               res.on( 'row', function( row )
               {
                  if( row[0] && row[0] !== 'migrations' )
                     db.push( row[0] );
               });
            })
            .on( 'end', function()
            {
               if( config.diffDump )
                  first = false;
               else
                  callback( db );
            });

      if( config.diffDump )
      {
         var query = util.format('USE %s; SHOW TABLES', config.database_diff);
         this.runSql( query, true )
            .on('result', function( res )
            {
               res.on( 'row', function( row )
               {
                  if( row[0] && row[0] !== 'migrations' )
                     diff.push( row[0] );
               });
            })
            .on( 'end', function()
            {
               while(first) {deasync.sleep(100);}

               callback( db, diff );
            });
      }
   },

   getFn: function( config, callback )
   {
      var self = this;
      var db = Array(), diff = Array(), first = true;
      var query = 'SELECT name, modified, type FROM mysql.proc WHERE db = ?';
         this.runSql( query, [ config.database ], false )
            .on( 'result', function( res )
            {
               res.on( 'row', function( row )
               {
                  diff.push( row );
               });
            })
            .on( 'end', function()
            {
               if( config.diffDump )
                  first = false;
               else
                  callback( db );
            });

      if( config.diffDump )
      {
         var query = 'SELECT name, modified, type FROM mysql.proc WHERE db = ?';
         this.runSql( query, [ config.database_diff ], false )
            .on('result', function( res )
            {
               res.on( 'row', function( row )
               {
                  diff.push( row );
               });
            })
            .on( 'end', function()
            {
               while(first) {deasync.sleep(100);}

               callback( db, diff );
            });
      }
   },

   runSql: function( )
   {
      var args = this._makeParamArgs(arguments);

      log.sql.apply(null, arguments);

      return this.connection.query.apply( this.connection, args );
   },

   _makeParamArgs: function(args) 
   {
      var params = Array.prototype.slice.call(args);
      var sql = params.shift();
      var callback = params.pop();

      if (params.length > 0 && Array.isArray(params[0])) 
      {
         params = params[0];
      }

      return [sql, params, callback];
   },

   close: function()
   {
      this.connection.end();
   }

};


exports.connect = function(config, callback) {
   var db;
  
   if( !config.db )
   {
      db = new mariasql();
      db.connect(config);
   }
   else
      db = config.db;

   db.on('connect', function()
   {
      callback(null, new MariasqlDriver(db));
      log.verbose('Client connected.');
   })
   .on('error', function(err) {
      console.log('Client error: ' + err);
   })
   .on('close', function(hadError) {
      log.verbose('Client closed');
   }); 
};