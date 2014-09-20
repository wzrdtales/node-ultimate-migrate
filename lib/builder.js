var log = require('db-migrate/lib/log');
var deasync = require('deasync');
var fs = require('fs');

Builder = function( driver, template, migrationsDir ) {
  this.counter = 0;
  this.template = template;
  this.diff = Array();
  this.avTables = Array();
  this.driver = driver;
  this.max = 6;//7-8
  this.migrationsDir = migrationsDir;

  require('./util');
};

function formatName(filestring, tables, action, incrementor, date) {
  var title = filestring.replace( /%filename%/i, tables );
  title = title.replace( /%action%/i, action );

  return formatDate(date) + incrementor + '-' + title;
}

function formatDate(date) {
  return [
    date.getUTCFullYear(),
    lpad(date.getUTCMonth() + 1, '0', 2),
    lpad(date.getUTCDate(), '0', 2),
    lpad(date.getUTCHours(), '0', 2),
    lpad(date.getUTCMinutes(), '0', 2),
    lpad(date.getUTCSeconds(), '0', 2)
  ].join('');
}

function lpad(str, padChar, totalLength) {
  str = str.toString();
  var neededPadding = totalLength - str.length;
  for (var i = 0; i < neededPadding; i++) {
    str = padChar + str;
  }
  return str;
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

       this.templating( config, callback );
       log.verbose('Collected Data Overview:', self.diff);
   },

   /**
     * This function calls all templating functionalities.
     *
     * We call creations first, then all drops.
     * We call keys after creating and adding tables and columns.
     *
     * 
     * Create order:
     *
     * 1: create tables
     * 2: add columns
     * 3: add engines
     * 4: add keys
     * 5: add foreign_keys
     * 6: create functions
     * 7: create procedures
     * 8: create views
     *
     * Drop Order:
     * The same, but reversed and inversed.
     *
     * @return boolean
     */
   templating: function( config, callback )
   {
      var self = this;
      var tables = self.diff['tables'];
      var columns = self.diff['columns'];
      var views = self.diff['views'];
      var fn = self.diff['fn'];
      var tsp = self.diff['tablespecific'];
      //var triggers = self.diff['triggers'];
      var fColumns = self.diff['fullcolumns'];
      var fEngines = self.diff['fullengines'];
      var fKeys = self.diff['fullindizies'];
      var inc = 0;

      console.log( tsp['atew']['indizies'][1] );


      //begin creating section
      //created tables
      for( var i = 0; i < tables[0].length; ++i )
      {
        var file = formatName( config.filestring, tables[0][i], 'createTable', inc++, new Date() );

        console.log( file, this.template.table( tables[0][i], fColumns[tables[0][i]][0] ) );
        this.write( file, this.template.table( tables[0][i], fColumns[tables[0][i]][0] ) );

        file = formatName( config.filestring, tables[0][i], 'setEngine', inc++, new Date() );
        console.log( file, this.template.engine( tables[0][i], fEngines[0][tables[0][i]] ) );
    
      }

      Object.keys( columns ).forEach( function( key )
      {
        //added columns
        if( columns[key][0][0].length > 0 )
        {
          var file = formatName( config.filestring, key, 'addColumns', inc++, new Date() );

          console.log( file, self.template.columns( key, columns[key][0][0] ) );

          //this.write( file, this.template.table( tables[0][i], fColumns[tables[0][i]][0] ) );
        }
      });

      Object.keys( tsp ).forEach( function( key )
      {
        //changing engine
        //tsp[key]
      });
      
      //end creation section

      //begin dropping section
      //dropped tables
      for( var i = 0; i < tables[1].length; ++i )
      {
        var file = formatName( config.filestring, tables[1][i], 'dropTable', inc++, new Date() );

        console.log( file, this.template.table( tables[1][i], fColumns[tables[1][i]][1], true ) );

        this.write( file, this.template.table( tables[1][i], fColumns[tables[1][i]][1], true ) );

        console.log( file, this.template.engine( tables[1][i], fEngines[1][tables[1][i]], true ) );
        console.log( file, this.template.keys( tables[1][i], self.buildArr( fKeys[1][tables[1][i]] ) ) );
      }


      Object.keys( columns ).forEach( function( key )
      {
        //dropped columns
        if( columns[key][0][0].length > 0 )
        {
          var file = formatName( config.filestring, key, 'dropColumns', inc++, new Date() );

          console.log( file, self.template.columns( key, columns[key][0][0], true ) );

          //this.write( file, this.template.table( tables[0][i], fColumns[tables[0][i]][0] ) );
        }
      });
   },

   write: function( file, text )
   {

   },

   columns: function( self, db )
   {
      var self = self || this;

      if( !self.diff['fullcolumns'] )
         self.diff['fullcolumns'] = Array();

      Object.keys( db[0] ).forEach( function( key )
      {
        if( !self.diff['fullcolumns'][key] )
          self.diff['fullcolumns'][key] = Array();
        
        self.diff['fullcolumns'][key][0] = db[0][key];
      });

      Object.keys( db[1] ).forEach( function( key )
      {
        if( !self.diff['fullcolumns'][key] )
          self.diff['fullcolumns'][key] = Array();

        self.diff['fullcolumns'][key][1] = db[1][key];
      });

      if( !self.diff['columns'] )
         self.diff['columns'] = Array();

      for( var i = 0; i < self.avTables.length; ++i )
      {
        var columns = Array(), available_columns = Array(), chg_columns = Array(),
        len = 0;

        columns = self.diffArr( db[0][self.avTables[i]] , db[1][self.avTables[i]] );

        available_columns[0] = self.buildArr( self.subArr( db[0][self.avTables[i]], columns[0] ) );
        available_columns[1] = self.buildArr( self.subArr( db[1][self.avTables[i]], columns[1] ) );

        if( available_columns[0] )
          Object.keys(available_columns[0]).forEach(function(key) {
            
            if( !available_columns[0][key].identicalTo( available_columns[1][key] ) )
              chg_columns[key] = available_columns[1][key];
          });

        self.diff['columns'][self.avTables[i]] = [ columns, chg_columns ];
      }      

      ++self.counter;
   },

   indizies: function( self, db )
   {
      var self = self || this;

      if( !self.diff['tablespecific'] )
        self.diff['tablespecific'] = Array();

      if( !self.diff['fullindizies'] )
        self.diff['fullindizies'] = Array();

      self.diff['fullindizies'] = db;

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
          available_keys[0] = self.subArr( db[0][self.avTables[i]], keys[0] );
          available_keys[1] = self.subArr( db[1][self.avTables[i]], keys[1] );

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
              var available_keys_chg = Array(), len = 0;

              if( !chg_keys[key] )
                chg_keys[key] = Array();


              chg_keys[key][0] = self.diffArr( available_keys[0][key], available_keys[1][key] );

              available_keys_chg[0] = self.subArr( available_keys[0][key], chg_keys[key][0][0] );
              available_keys_chg[1] = self.subArr( available_keys[1][key], chg_keys[key][0][1] );

              for( var o = 0; o < 2; ++o )
              {
                available_keys_chg[o] = self.buildArr( available_keys_chg[o] );
                
                if( available_keys_chg[o] )
                  Object.keys(available_keys_chg[o]).forEach(function(key) {
                    available_keys_chg[o][key] = self.moveItem( available_keys_chg[o][key], 2, 0 );
                  });          
              }

              if( available_keys_chg[0] )
                Object.keys(available_keys_chg[0]).forEach(function(key_chg) {
                  var tmp_key = Array();

                  if( !chg_keys[key][1] )
                    chg_keys[key][1] = Array();

                  if( !available_keys_chg[0][key_chg].identicalTo( available_keys_chg[1][key_chg] ) )
                  {
                    tmp_key[key_chg] = available_keys_chg[0][key_chg];
                    chg_keys[key][1].push( tmp_key );
                  }
                });
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
          available_keys[0] = self.subArr( db[0][self.avTables[i]], keys[0] );
          available_keys[1] = self.subArr( db[1][self.avTables[i]], keys[1] );

          for( var o = 0; o < 2; ++o )
            available_keys[o] = self.buildArr( available_keys[o] );    

          new_keys = self.buildArr( keys[0] );
          lost_keys = self.buildArr( keys[1] );
          //end collecting

          //diff on foreign key column name
          if( available_keys[0] )
            Object.keys(available_keys[0]).forEach(function(key) {
              var available_keys_chg = Array();

              if( !chg_keys[key] )
                chg_keys[key] = Array();

              chg_keys[key][0] = self.diffArr( available_keys[0][key], available_keys[1][key] );

              available_keys_chg[0] = self.subArr( available_keys[0][key], chg_keys[key][0][0] );
              available_keys_chg[1] = self.subArr( available_keys[1][key], chg_keys[key][0][1] );

              for( var o = 0; o < 2; ++o )
              {
                available_keys_chg[o] = self.buildArr( available_keys_chg[o] );
                
                if( available_keys_chg[o] )
                  Object.keys(available_keys_chg[o]).forEach(function(key) {
                    available_keys_chg[o][key] = self.moveItem( available_keys_chg[o][key], 2, 0 );
                  });          
              }

              if( available_keys_chg[0] )
                Object.keys(available_keys_chg[0]).forEach(function(key_chg) {
                  var tmp_key = Array();

                  if( !chg_keys[key][1] )
                    chg_keys[key][1] = Array();

                  if( !available_keys_chg[0][key_chg].identicalTo( available_keys_chg[1][key_chg] ) )
                  {
                    tmp_key[key_chg] = available_keys_chg[0][key_chg];
                    chg_keys[key][1].push( tmp_key );
                  }
                });
            });

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

       if( !self.diff['fullengines'] )
         self.diff['fullengines'] = Array();

       self.diff['fullengines'][0] = db[0];
       self.diff['fullengines'][1] = db[1];

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
            {
              engine = db[1][self.avTables[i]][0][0];
              chg_engine = db[0][self.avTables[i]][0][0];
            }
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

      var tmp = Array();
      if( typeof( arr[0] ) === 'object' )
      {
         tmp[0] = Array();
         tmp[1] = Array();
         for( var i = 0; i < arr.length; ++i )
         {
           if( arr.length > i )
              tmp[0].push( arr[i][0] );

           if( sub.length > i )
              tmp[1].push( sub[i][0] );
         }
      }
      else
      {
        tmp[0] = arr;
        tmp[1] = sub;
      }


      for( var i = 0; i < arr.length; ++i )
      {
          if( tmp[1].indexOf( tmp[0][i] ) === -1 )
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

      var tmp = Array();
      if( typeof( arr[0] ) === 'object' )
      {
         tmp[0] = Array();
         tmp[1] = Array();
         for( var i = 0; i < arr.length; ++i )
         {
           if( arr.length > i )
              tmp[0].push( arr[i][0] );

           if( match.length > i )
              tmp[1].push( match[i][0] );
         }
      }
      else
      {
        tmp[0] = arr;
        tmp[1] = match;
      }

      for( var i = 0; i < arr.length; ++i )
      {
          if( tmp[1].indexOf( tmp[0][i] ) !== -1 )
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
        var copy = arr[i].slice();
        copy.splice( index, 1 );
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
