var log = require('db-migrate/lib/log');
var deasync = require('deasync');

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
  this.max = 6;//7-8
  this.migrationsDir = migrationsDir;
};

Builder.prototype = {

   //ToDo: enums for types
   //Create DataMap for Arrays
   build: function( config, callback )
   {
      var self = this;

      var caps = this.driver.capabilities;
      log.verbose( 'Driver provides:', caps );

      if( caps.indexOf('tables') !== -1 || caps.indexOf('views') !== -1 )
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

            self.avTables = self.subArr( db[0], self.diff['tables'][1] );

            self.driver.getColumns( config, tableList, self, self.columns );
            if( caps.indexOf('indizies') !== -1 )
              self.driver.getIndizies( config, tableList, self, self.indizies );
            else
              --this.max;

            if( caps.indexOf('engines') !== -1 )
              self.driver.getEngine( config, self, self.engines );
            else
              --this.max;

            if( caps.indexOf('foreign_keys') !== -1 )
              self.driver.getFK( config, tableList, self, self.foreign_keys );
            else
              --this.max;

            
            ++self.counter;
         });
       else
        this.max -= 3;

      if( caps.indexOf('functions') !== -1 || caps.indexOf('procedures') !== -1 )
         this.driver.getFn( config, function( db, dbdiff )
         {
            if( db.length === 0 && 
              ( dbdiff.length === 0 && config.diffDump ) )
            {
               return ++self.counter;
            }

            //ToDo: We don't only want to check if it exist or not,
            //but to check if it was modified. For this purpose
            //we need additional information so I'm going to 
            //modify the way how db-migrate behaves.
            //
            //For now this implementation wont take any action, later.
            self.diff['fn'] = self.diffArr( db, dbdiff );
            ++self.counter;
         });
       else
        --this.max;

       while( self.counter < this.max ) deasync.sleep(100);

       log.verbose('Collected Data Overview:', self.diff);
   },

   columns: function( self, db )
   {
      var self = self || this;

      if( !self.diff['columns'] )
         self.diff['columns'] = Array();

      for( var i = 0; i < self.avTables.length; ++i )
         self.diff['columns'][self.avTables[i]] = self.diffArr( db[0][self.avTables[i]] , db[1][self.avTables[i]] );

       //ToDo: Implement differences within columns
       //Yet it just checks if the column is in both tables

      ++self.counter;
   },

   indizies: function( self, db )
   {
      var self = self || this;

      if( !self.diff['tablespecific'] )
         self.diff['tablespecific'] = Array();

      for( var i = 0; i < self.avTables.length; ++i )
      {
        var keys = Array(), lost_keys = Array(),
        chg_keys = Array(), available_keys = Array();

        if( db[0][self.avTables[i]] || db[1][self.avTables[i]] )
        {
          if( !self.diff['tablespecific'][self.avTables[i]] )
            self.diff['tablespecific'][self.avTables[i]] = Array();

          //diff on key name
          keys = self.diffArr( db[0][self.avTables[i]], db[1][self.avTables[i]] );

          //collecting data
          available_keys[0] = self.matchArr( db[0][self.avTables[i]], keys[0] );
          available_keys[1] = self.matchArr( db[1][self.avTables[i]], keys[1] );

          for( var o = 0; o < 2; ++o )
          {
            available_keys[o] = self.buildArr( available_keys[o] );
            
            if( available_keys[o] )
              Object.keys(available_keys[o]).forEach(function(key) {
                available_keys[o][key] = self.moveItem( available_keys[o][key], 2, 0 );
              });          
          }
          
          new_keys = self.buildArr( keys[0] );

          if( new_keys )
            Object.keys(new_keys).forEach(function(key) {
              new_keys[key] = self.moveItem( new_keys[key], 2, 0 );
            });

          lost_keys = self.buildArr( keys[1] );

          if( lost_keys )          
            Object.keys(lost_keys).forEach(function(key) {
              lost_keys[key] = self.moveItem( lost_keys[key], 2, 0 );
            });
          //end collecting

          //diff on key index name
          if( available_keys[0] )
            Object.keys(available_keys[0]).forEach(function(key) {
              chg_keys[key] = self.diffArr( available_keys[0][key], available_keys[1][key] );

              //ToDo: Implement full row matching
            });

          self.diff['tablespecific'][self.avTables[i]]['indizies'] = [ new_keys, lost_keys, chg_keys ];
        }
      }

      ++self.counter;
   },

   foreign_keys: function( self, db )
   {
      var self = self || this;

      if( !self.diff['tablespecific'] )
         self.diff['tablespecific'] = Array();

      for( var i = 0; i < self.avTables.length; ++i )
      {
        var keys = Array(), new_keys = Array(), chg_keys = Array();
        lost_keys = Array(), available_keys = Array();

        if( db[0][self.avTables[i]] || db[1][self.avTables[i]] )
        {
          if( !self.diff['tablespecific'][self.avTables[i]] )
            self.diff['tablespecific'][self.avTables[i]] = Array();

          //diff on key name
          keys = self.diffArr( db[0][self.avTables[i]], db[1][self.avTables[i]] );

          //collecting data
          available_keys[0] = self.matchArr( db[0][self.avTables[i]], keys[0] );
          available_keys[1] = self.matchArr( db[1][self.avTables[i]], keys[1] );

          new_keys = self.buildArr( keys[0] );
          lost_keys = self.buildArr( keys[1] );
          //end collecting

          console.log( lost_keys );

          self.diff['tablespecific'][self.avTables[i]]['foreign_keys'] = [ new_keys, lost_keys, chg_keys ];
        }
      }

      ++self.counter;      
   },

   engines: function( self, db )
   {
      var self = self || this;

      if( !self.diff['tablespecific'] )
         self.diff['tablespecific'] = Array();

       db[0] = self.buildArr( db[0] );
       db[1] = self.buildArr( db[1] );

      for( var i = 0; i < self.avTables.length; ++i )
      {
        var engine = '', chg_engine = '';

        if( db[0][self.avTables[i]] || db[1][self.avTables[i]] )
        {
          if( !self.diff['tablespecific'][self.avTables[i]] )
            self.diff['tablespecific'][self.avTables[i]] = Array();

          if( db[1][self.avTables[i]] )
          {
            if( db[0][self.avTables[i]][0][0] !== db[1][self.avTables[i]][0][0] )
              chg_engine = db[0][self.avTables[i]][0][0];
            else
              engine = db[0][self.avTables[i]][0][0];
          }
          else
            engine = db[0][self.avTables[i]][0][0];

          self.diff['tablespecific'][self.avTables[i]]['engine'] = [ engine, chg_engine ];
        }
      }

      ++self.counter;
   },

   /**
     * Subtracts matching Items from array.
     *
     * @return array
     */
   subArr: function( arr, sub )
   {
      var substracted = Array();

      if( !arr )
        return arr;

      for( var i = 0; i < arr.length; ++i )
      {
          if( sub.indexOf( arr[i] ) === -1 )
            substracted.push( arr[i] );
      }

      return substracted;
   },

   /**
     * Returns an array of all matching elements from both arrays.
     *
     * @return array
     */
   matchArr: function( arr, match )
   {
      var matched = Array();

      if( !arr )
        return arr;

      for( var i = 0; i < arr.length; ++i )
      {
          if( match.indexOf( arr[i] ) !== -1 )
            matched.push( arr[i] );
      }

      return matched;
   },

   /**
     * Builds an array out of all matching elements of provided index.
     * Index defaults to zero if not specified.
     *
     * @return array
     */
   buildArr: function( arr, index )
   {
      var index = index || 0;
      var builded = Array();

      if( !arr )
        return arr;

      for( var i = 0; i < arr.length; ++i )
      {
        var copy = arr[i].slice(index+1, arr[i].length);
        var in_index = arr[i][index];
        if( !builded[in_index] )
          builded[in_index] = Array();

        builded[in_index].push( copy );
      }
   
      return builded;
   },

   /**
     * Moves an index within an array to another position, for all array elements.
     *
     * @return array
     */
   moveItem: function( arr, index, position, overwrite )
   {
      var overwrite = overwrite || false;
      var inc = ( overwrite ) ? 1 : 2;
      var moved = Array();

      for( var i = 0; i < arr.length; ++i  )
      {
        moved[i] = Array();

        for( var o = 0; o < arr[i].length; ++o )
        {
          if( i < position )
            moved[i][o] = arr[i][o];
          else if( o === position )
          {
            moved[i][o] = arr[i][index];
            if( !overwrite )
              moved[i][o+1] = arr[i][o];
          }
          else if( o < index )
            moved[i][o+inc] = arr[i][o];
          else if( o === index )
            moved[i][o] = arr[i][o-1];
          else
            moved[i][o] = arr[i][o];
        }
      }

      return moved;
   },

   /**
     * Makes a diff betwee arr and diff and sorts it in deleted
     * and available.
     *
     * Array [0] = added, [1] = deleted
     *
     * @return array
     */
   diffArr: function( arr, diff )
   {
      var differences = Array();
      differences[0] = Array();
      differences[1] = Array();

      if( !diff )
      {
         differences[0] = arr;
      }
      else if( !arr )
      {
        differences[1] = diff;
      }
      else if( arr )
      {
         var tmp = Array();
         var len = ( diff.length > arr.length ) ? diff.length : arr.length;
         if( typeof( arr[0] ) === 'object' )
         {
            tmp[0] = Array();
            tmp[1] = Array();
            for( var i = 0; i < len; ++i )
            {
              if( arr.length > i )
                tmp[0].push( arr[i][0] );

              if( diff.length > i )
                tmp[1].push( diff[i][0] );
            }
         }
         else
         {
           tmp[0] = arr;
           tmp[1] = diff;
         }

          for( var i = 0; i < len; ++i )
          {
             if( tmp[1].length > i && tmp[0].indexOf( tmp[1][i] ) === -1 )
                differences[1].push( diff[i] );

             if( tmp[0].length > i && tmp[1].indexOf( tmp[0][i] ) === -1 )
                differences[0].push( arr[i] );
          }
      }

      return differences;
   },

   diffObjKeys: function( obj, diff )
   {
      var differences = Array();
      differences[0] = Array();
      differences[1] = Array();

      if( !diff )
      {
         differences[0] = obj;
      }
      else if( !obj )
      {
        differences[1] = diff;
      }
      else if( obj )
      {
        //ToDo
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
