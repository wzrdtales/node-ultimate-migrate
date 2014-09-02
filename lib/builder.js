var log = require('db-migrate/lib/log');

var migrationTemplate = [
  "var dbm = require('db-migrate');\nvar type = dbm.dataType;}\n\nexports.up = function(db, callback) {\n",
  "};\n\nexports.down = function(db, callback) {\n",
  "};\n"
];

Builder = function( driver, migrationsDir ) {
  this.counter = 0;
  this.diff = Array();
  this.avTables = Array();
  this.driver = driver;
  this.migrationsDir = migrationsDir;
};

Builder.prototype = {

   //ToDo: enums for types
   //Create DataMap for Arrays
   build: function( config, callback )
   {
      var self = this;

      var caps = this.driver.capabilities;

      if( !caps['tables'] && !caps['views'] )
         this.driver.getTables( config, function( db, dbdiff )
         {
            if( db.length === 0 && 
              ( dbdiff.length === 0 && config.diffDump ) )
            {
               return ++self.counter;
            }

            self.diff['tables'] = self.diffArr( db[0], dbdiff[0] );
            self.diff['views'] = self.diffArr( db[1], dbdiff[1] );

            var tableList = Array();
            tableList['tables'] = [ db[0], dbdiff[0] ];
            tableList['views'] = [ db[1], dbdiff[1] ];

            self.avTables = self.subArr( db[0], self.diff['tables'][0] );

            self.driver.getColumns( config, tableList, self, self.columns );
            
            ++self.counter;
         });

      if( !caps['functions'] && !caps['procedures'] )
         this.driver.getFn( config, function( db, dbdiff )
         {
            if( db.length === 0 && 
              ( dbdiff.length === 0 && config.diffDump ) )
            {
               return ++self.counter;
            }

            //ToDo: We don't want only want to check if it exist or not,
            //but to check if it was modified, we need additional information
            //so I'm going to modificate the way how db-migrate behaves.
            //
            //For now this implementation wont take any action.
            self.diff['fn'] = self.diffArr( db, dbdiff );
            ++self.counter;
         });
   },

   columns: function( self, db )
   {
      var self = self || this;

      if( !self.diff['columns'] )
         self.diff['columns'] = Array();

      console.log( self.avTables );

      for( var i = 0; i < self.avTables.length; ++i )
         self.diff['columns'][self.avTables[i]] = self.diffArr( db[0][self.avTables[i]], db[1][self.avTables[i]] );
      console.log(self.diff);
      ++self.counter;
   },

   subArr: function( arr, sub )
   {
      var substracted = Array();

      for( var i = 0; i < arr.length; ++i )
      {
         if( sub.indexOf( arr[i] ) === -1 )
            substracted.push( arr[i] );
      }

      return substracted;
   },

   diffArr: function( arr, diff )
   {
      var differences = Array();
      differences[0] = Array();
      differences[1] = Array();
      var len = ( diff.length > arr.length ) ? diff.length : arr.length;
      if( !diff )
      {
         differences[0] = arr;
      }
      else
      {
         if( typeof( arr[0] ) === 'object' )
            for( var i = 0; i < len; ++i )
            {
               if( diff.length > i && arr.indexOf( diff[i][0] ) === -1 )
                  differences[1].push( diff[i] );

               if( arr.length > i && diff.indexOf( arr[i][0] ) === -1 )
                  differences[0].push( arr[i] );
            }
         else
            for( var i = 0; i < len; ++i )
            {
               if( diff.length > i && arr.indexOf( diff[i] ) === -1 )
                  differences[1].push( diff[i] );

               if( arr.length > i && diff.indexOf( arr[i] ) === -1 )
                  differences[0].push( arr[i] );
            }
      }

      return differences;
   },

   close: function()
   {
      if( this.driver )
         this.driver.close();
   }

};
module.exports = Builder;
