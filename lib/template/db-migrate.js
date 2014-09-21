var log = require('db-migrate/lib/log');
var util = require('util');
var deasync = require('deasync');

function MigrationBuilder( primary )
{
   this.primary = primary;
   this.migrationTemplate = [
     "var dbm = require('db-migrate');\nvar type = dbm.dataType;\n\nexports.up = function(db, callback) {\n",
     "\n};\n\nexports.down = function(db, callback) {\n",
     "\n};\n"
     ];
}

MigrationBuilder.prototype = {

   table: function( table, columns, drop )
   {
      var createTable = util.format( "db.createTable('%s', {", table ); 
      var dropTable = util.format( "db.dropTable('%s', ifExists: true, callback);", table);

      createTable += this.Columns( "\n%s: { type: '%s'", columns, " }," );

      createTable += "\n}, callback);";

      return this.createMigration( createTable, dropTable, drop );
   },

   //ToDo: callback for all columns
   columns: function( table, columns, drop )
   {
      var addColumn = '', dropColumn = '';
      var aC = util.format( "db.addColumn('%s', '%%s', { type: '%%s'", table ); 
      var dC = util.format( "db.removeColumn('%s', '%%s', callback);", table );

      for( var i = 0; i < columns.length; ++i )
      {
         if( i > 0)
            dropColumn += '\n';

         dropColumn += util.format( dC, columns[i][0] );
      }

      addColumn += this.Columns( aC, columns, ' } );', true);

      return this.createMigration( addColumn, dropColumn, drop );
   },

   changeKeys: function( table, keys, drop )
   {
      var addKey = '', dropKey = '', firstLine = true, firstKey = true;
      var aK = util.format( "db.removeIndex('%s', '%%s', function() {\ndb.addIndex('%s', '%%s', [ ", table, table );
      var dK = util.format( "db.removeIndex('%s', '%%s', function() {\ndb.addIndex('%s', '%%s', [ ", table, table );

      Object.keys( keys ).forEach( function( key )
      {
         var addUnique = false, dropUnique = false;

         if( key === 'PRIMARY' )
            return;

         if( !firstLine )
         {
            dropKey += '\n';
            addKey += '\n';
         }
         else
            firstLine = false;

         addKey += util.format( aK, key, key );
         dropKey += util.format( dK, key, key );

         Object.keys( keys[key] ).forEach( function( _key )
         {
            if( firstKey )
            {
               firstKey = false;
               addKey += _key;
               dropKey += _key;
            }
            else
            {
               addKey += ', ' + _key;
               dropKey += ', ' + _key;
            }

            if( !addUnique )
               addUnique = keys[key][_key][0][0];

            if( !dropUnique )
               dropUnique = keys[key][_key][1][0];
         });

         if( addUnique )
            addKey += ' ], true );'
         else
            addKey += ' ] );';

         if( dropUnique )
            dropKey += ' ], true );'
         else
            dropKey += ' ] );';

         addKey += '\n});'
         dropKey += '\n});'
      });

      //removeIndex([tableName], indexName, callback);
      //addIndex(tableName, indexName, columns, [unique], callback);

      return this.createMigration( addKey, dropKey, drop );
   },

   keys: function( table, keys, drop )
   {
      var addKey = '', dropKey = '', firstLine = true;
      var aK = util.format( "db.addIndex('%s', '%%s', [ ", table );
      var dK = util.format( "db.removeIndex('%s', '%%s');", table );

      Object.keys( keys ).forEach( function( key )
      {
         if( key === 'PRIMARY' )
            return;

         if( !firstLine )
         {
            dropKey += '\n';
            addKey += '\n';
         }
         else
            firstLine = false;

         addKey += util.format( aK, key );
         dropKey += util.format( dK, key );


         addKey += keys[key][0][2];
         for( var i = 1; i < keys[key].length; ++i )
         {
            addKey += ', ' + keys[key][i][2];
         }

         if( keys[key][0][1] )
            addKey += ' ], true );'
         else
            addKey += ' ] );';
      });

      //removeIndex([tableName], indexName, callback);
      //addIndex(tableName, indexName, columns, [unique], callback);

      return this.createMigration( addKey, dropKey, drop );
   },

   engine: function( table, engines, drop )
   {
      var sql = util.format( "ALTER TABLE %s ENGINE = ?", table );
      var createEngine = "runSql('" + sql + "', '" + engines[0] + "', callback);";
      var dropEngine = '';

      if( engines[1] )
         dropEngine = "runSql('" + sql + "', '" + engines[1] + "', callback);";
      else
         dropEngine = "callback(); //irreversable migration";

      return  this.createMigration( createEngine, dropEngine, drop );
   },

   Columns: function( begin, columns, end, br )
   {
      var create = '';

      for( var i = 0; i < columns.length; ++i )
      {
         if( br && i > 0 )
            create += '\n';  

         create += util.format( begin , columns[i][0], columns[i][1][0] );
         if( columns[i][1][2] )
            create += ", unsigned: true";

         if( !columns[i][2] )
            create += ", notNull: true";

         if( columns[i][3] )
            create += util.format( ", defaultValue: '%s'", columns[i][3] );

         //Some DBS may have no primary keys. But I like to have the primary key information in the creation information,
         //instead of storing them separated like the other keys.
         if( this.primary && columns[i][4] === 'PRI' )
            create += ", primaryKey: true";

         if( columns[i][5] )
            create += ", autoIncrement: true";

         create += util.format( ", length: %d", columns[i][1][1] );
         create += end;
      }

      return create;
   },

   createMigration: function( up, down, drop )
   {
      if( drop )
         return this.migrationTemplate[0] + down + this.migrationTemplate[1] + up + this.migrationTemplate[2];
      else
         return this.migrationTemplate[0] + up + this.migrationTemplate[1] + down + this.migrationTemplate[2];
   },

};



exports.connect = function(config, callback) {
   callback( null, new MigrationBuilder( config.primary ) );
};