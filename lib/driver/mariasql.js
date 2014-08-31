var mariasql = require('mariasql');
var log = require('db-migrate/lib/log');
var util = require('util');
var deasync = require('deasync');

function MariasqlDriver( connection )
{
   this.capabilities = [ 'tables', 'views', 'functions', 'procedures' ];
   this.connection = connection;
}

MariasqlDriver.prototype = {

   getTables: function( config, callback )
   {
      var self = this;
      var db = Array(), diff = Array(), first = true;
      db[0] = Array();
      db[1] = Array();
      diff[0] = Array();
      diff[1] = Array();

      var query = util.format('USE %s; SHOW FULL TABLES', config.database);
         this.runSql( query, true )
            .on( 'result', function( res )
            {
               res.on( 'row', function( row )
               {
                  if( row[0] && row[1] === 'VIEW' )
                     db[1].push( row[0] )
                  if( row[0] && row[0] !== 'migrations' )
                     db[0].push( row[0] );
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
         var query = util.format('USE %s; SHOW FULL TABLES', config.database_diff);
         this.runSql( query, true )
            .on('result', function( res )
            {
               res.on( 'row', function( row )
               {
                  if( row[0] && row[1] === 'VIEW' )
                     diff[1].push( row[0] )
                  else if( row[0] && row[0] !== 'migrations' )
                     diff[0].push( row[0] );
               });
            })
            .on( 'end', function()
            {
               while(first) {deasync.sleep(100);}

               callback( db, diff );
            });
      }
   },

   getColumns: function( config, tables, callback )
   {
      var self = this, counter = 0, stmt = 0;
      var db = Array(), diff = Array(), first = true;
      db[0] = Array();
      db[1] = Array();

      var len = ( tables['tables'][0].length > tables['tables'][1].length ) ?
                  tables['tables'][0].length : tables['tables'][1].length;

      for( var i = 0; i < len; ++ i)
      {
         var query = '';

         if( tables['tables'][0][i] )
            query = util.format('SHOW COLUMNS FROM %s.%s;', config.database, tables['tables'][0][i] );
         else 
            ++stmt;

         if( tables['tables'][1][i] )   
            query += util.format('SHOW COLUMNS FROM %s.%s;', config.database_diff, tables['tables'][1][i] );

         this.runSql( query, true )
            .on( 'result', function( res )
            {
               var local = stmt++;
               res.on( 'row', function( row )
               {
                  db[local].push(row);
               });
            })
            .on( 'end', function()
            {
               if( ++counter >= len )
                  callback( db );
            });
      }
   },

   getFn: function( config, callback )
   {
      var self = this;
      var db = Array(), diff = Array(), first = true;
      db[0] = Array();
      db[1] = Array();
      diff[0] = Array();
      diff[1] = Array();

      var query = 'SELECT name, modified, type FROM mysql.proc WHERE db = ?';
         this.runSql( query, [ config.database ], false )
            .on( 'result', function( res )
            {
               res.on( 'row', function( row )
               {
                  if( row.type === 'FUNCTION' )
                     db[0].push( [ row.name, row.modified ] );
                  else if( row.type === 'PROCEDURE' )
                     db[1].push( [ row.name, row.modified ] );
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
                  if( row.type === 'FUNCTION' )
                     diff[0].push( [ row.name, row.modified ] );
                  else if( row.type === 'PROCEDURE' )
                     diff[1].push( [ row.name, row.modified ] );
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