var log = require( 'db-migrate/lib/log' );
var deasync = require( 'deasync' );
var fs = require( 'fs' );

var internals = {};

Builder = function ( driver, template, migrationsDir )
{
    internals.counter       = 0;
    internals.template      = template;
    internals.diff          = Array();
    internals.avTables      = Array();
    internals.driver        = driver;
    internals.max           = 6; //7-8
    internals.migrationsDir = migrationsDir + '/';
    internals.written       = 0;

    require( './util' );
};

function formatName( filestring, tables, action, incrementor, date )
{
    var title = filestring.replace( /%filename%/i, tables );
    title = title.replace( /%action%/i, action );

    return formatDate( new Date( date.getTime() + ( 1000 * incrementor) ) ) + '-' + title;
}

function formatDate( date )
{
    return [
        date.getUTCFullYear(),
        lpad( date.getUTCMonth() + 1, '0', 2 ),
        lpad( date.getUTCDate(), '0', 2 ),
        lpad( date.getUTCHours(), '0', 2 ),
        lpad( date.getUTCMinutes(), '0', 2 ),
        lpad( date.getUTCSeconds(), '0', 2 )
    ].join( '' );
}

function lpad( str, padChar, totalLength )
{
    str = str.toString();
    var neededPadding = totalLength - str.length;
    for ( var i = 0; i < neededPadding; i++ )
    {
        str = padChar + str;
    }
    return str;
}

Builder.prototype = {

    //ToDo: enums for types
    //Create DataMap for Arrays
    build: function ( config, down, callback )
    {
        var self = this;

        this.callback = callback;
        this.config   = config;

        var caps = internals.driver.capabilities;
        log.verbose( 'Driver provides:', caps );

        if ( caps.indexOf( 'tables' ) !== -1 || caps.indexOf( 'views' ) !== -1 )
            internals.driver.getTables( config, function ( db )
            {
                if ( db[ 0 ].length === 0 &&
                    ( db[ 1 ].length === 0 && config.diffDump ) )
                {
                    return ++internals.counter;
                }

                internals.diff.tables = self.diffArr( db[ 0 ][ 0 ], db[ 1 ][ 0 ] );
                internals.diff.views  = self.diffArr( db[ 0 ][ 1 ], db[ 1 ][ 1 ] );

                var tableList = Array();
                tableList.tables = [ db[ 0 ][ 0 ], db[ 1 ][ 0 ] ];
                tableList.views  = [ db[ 0 ][ 1 ], db[ 1 ][ 1 ] ];

                internals.avTables    = self.subArr( db[ 0 ], internals.diff.tables[ 1 ] );

                internals.driver.getColumns( config, tableList, self, self.columns );
                if ( caps.indexOf( 'indizies' ) !== -1 )
                    internals.driver.getIndizies( config, tableList, self, self.indizies );
                else --internals.max;

                if ( caps.indexOf( 'engines' ) !== -1 )
                    internals.driver.getEngine( config, self, self.engines );
                else --internals.max;

                if ( caps.indexOf( 'foreign_keys' ) !== -1 )
                    internals.driver.getFK( config, tableList, self, self.foreign_keys );
                else --internals.max;


                ++internals.counter;
            } );
        else
            internals.max -= 3;

        if ( caps.indexOf( 'functions' ) !== -1 || caps.indexOf( 'procedures' ) !== -1 )
            internals.driver.getFn( config, function ( db, dbdiff )
            {
                if ( db.length === 0 &&
                    ( dbdiff.length === 0 && config.diffDump ) )
                {
                    return ++internals.counter;
                }

                //ToDo: We don't only want to check if it exist or not,
                //but to check if it was modified. For this purpose
                //we need additional information so I'm going to 
                //modify the way how db-migrate behaves.
                //
                //For now this implementation wont take any action, later.
                internals.diff.fn = self.diffArr( db, dbdiff );
                ++internals.counter;
            } );
        else --internals.max;

        while ( internals.counter < internals.max ) deasync.sleep( 100 );

        down( function() 
        { 
            self.templating( config );
        } );

        log.verbose( 'Collected Data Overview:', internals.diff );
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
     * Change Order:
     * The same.
     *
     * @return boolean
     */
    templating: function ( config )
    {
        var self = this,
            tables = internals.diff.tables,
            columns = internals.diff.columns,
            views = internals.diff.views,
            fn = internals.diff.fn,
            tsp = internals.diff.tablespecific,
            //triggers = internals.diff['triggers'],
            fColumns = internals.diff.fullcolumns,
            fEngines = internals.diff.fullengines,
            fKeys = internals.diff.fullindizies,
            inc = 0, i = 0, kI = 0;


        //begin creating section
        //created tables
        for ( i = 0; i < tables[ 0 ].length; ++i )
        {
            file = formatName( config.filestring, tables[ 0 ][ i ], 'createTable', inc++, new Date() );

            self.write( file, internals.template.table( tables[ 0 ][ i ], fColumns[ tables[ 0 ][ i ] ][ 0 ] ) );

            file = formatName( config.filestring, tables[ 0 ][ i ], 'setEngine', inc++, new Date() );
            self.write( file, internals.template.engine( tables[ 0 ][ i ], fEngines[ 0 ][ tables[ 0 ][ i ] ] ) );

            file = formatName( config.filestring, tables[ 0 ][ i ], 'setKeys', inc++, new Date() );
            self.write( file, internals.template.keys( tables[ 0 ][ i ], self.buildArr( fKeys[ 0 ][ tables[ 0 ][ i ] ] ) ) );
        }

        var oKeys = Object.keys( columns );
        for ( kI = 0; kI < oKeys.length; ++kI )
        {
            if ( tables[ 0 ].indexOf( oKeys[ kI ] ) !== -1 || tables[ 1 ].indexOf( oKeys[ kI ] ) !== -1 )
                continue;

            //added columns
            if ( columns[ oKeys[ kI ] ][ 0 ][ 0 ] && columns[ oKeys[ kI ] ][ 0 ][ 0 ].length > 0 )
            {
                file = formatName( config.filestring, oKeys[ kI ], 'addColumns', inc++, new Date() );
                self.write( file, internals.template.columns( oKeys[ kI ], columns[ oKeys[ kI ] ][ 0 ][ 0 ] ) );

                //self.write( file, internals.template.table( tables[0][i], fColumns[tables[0][i]][0] ) );
            }
        }

        oKeys = Object.keys( tsp );
        for ( kI = 0; kI < oKeys.length; ++kI )
        {
            if ( tables[ 0 ].indexOf( oKeys[ kI ] ) !== -1 || tables[ 1 ].indexOf( oKeys[ kI ] ) !== -1 )
                continue;

            //changing oKeys[ kI ]
            //tsp[oKeys[ kI ]]
            if ( tsp[ oKeys[ kI ] ].indizies )
            {
                if ( Object.keys( tsp[ oKeys[ kI ] ].indizies[ 2 ] ).length )
                {
                    file = formatName( config.filestring, oKeys[ kI ], 'changeKeys', inc++, new Date() );
                    self.write( file, internals.template.changeKeys( oKeys[ kI ], tsp[ oKeys[ kI ] ].indizies[ 2 ], false, 1 ) );
                }

                if ( Object.keys( tsp[ oKeys[ kI ] ].indizies[ 1 ] ).length )
                {
                    file = formatName( config.filestring, oKeys[ kI ], 'dropKeys', inc++, new Date() );
                    self.write( file, internals.template.keys( oKeys[ kI ], tsp[ oKeys[ kI ] ].indizies[ 1 ], true, 0 ) );
                }

                if ( Object.keys( tsp[ oKeys[ kI ] ].indizies[ 0 ] ).length )
                {
                    file = formatName( config.filestring, oKeys[ kI ], 'addKeys', inc++, new Date() );
                    self.write( file, internals.template.keys( oKeys[ kI ], tsp[ oKeys[ kI ] ].indizies[ 0 ], false, 0 ) );
                }
            }

            //changing engine
            if ( tsp[ oKeys[ kI ] ].engine && tsp[ oKeys[ kI ] ].engine[ 1 ] )
            {
                file = formatName( config.filestring, oKeys[ kI ], 'changeEngine', inc++, new Date() );
                self.write( file, internals.template.engine( oKeys[ kI ], tsp[ oKeys[ kI ] ].engine ) );
            }
        }

        //end creation section

        //begin dropping section
        //dropped tables
        for ( i = 0; i < tables[ 1 ].length; ++i )
        {
            file = formatName( config.filestring, tables[ 1 ][ i ], 'dropKeys', inc++, new Date() );
            self.write( file, internals.template.keys( tables[ 1 ][ i ], self.buildArr( fKeys[ 1 ][ tables[ 1 ][ i ] ] ) ) );

            file = formatName( config.filestring, tables[ 1 ][ i ], 'dropEngine', inc++, new Date() );
            self.write( file, internals.template.engine( tables[ 1 ][ i ], fEngines[ 1 ][ tables[ 1 ][ i ] ], true ) );
            

            file = formatName( config.filestring, tables[ 1 ][ i ], 'dropTable', inc++, new Date() );
            self.write( file, internals.template.table( tables[ 1 ][ i ], fColumns[ tables[ 1 ][ i ] ][ 1 ], true ) );
        }


        oKeys = Object.keys( columns );
        for ( kI = 0; kI < oKeys.length; ++kI )
        {
            if ( tables[ 0 ].indexOf( oKeys[ kI ] ) !== -1 || tables[ 1 ].indexOf( oKeys[ kI ] ) !== -1 )
                continue;
            
            //dropped columns
            if ( columns[ oKeys[ kI ] ][ 0 ][ 1 ] && columns[ oKeys[ kI ] ][ 0 ][ 1 ].length > 0 )
            {
                file = formatName( config.filestring, oKeys[ kI ], 'dropColumns', inc++, new Date() );
                self.write( file, internals.template.columns( oKeys[ kI ], columns[ oKeys[ kI ] ][ 0 ][ 1 ], true ) );

                //self.write( file, internals.template.table( tables[0][i], fColumns[tables[0][i]][0] ) );
            }
        }

        while ( inc > internals.written ) deasync.sleep( 100 );

        self.callback();

    },

    write: function ( file, text, self ) 
    {
        var cmd = null, 
        self = self || this;

        file = internals.migrationsDir + file + '.js';

        if( !file || !text )
        {
            ++internals.written;
            log.verbose( 'Error! Content of following file was empty: ' + file );
            return;
        }

        if( this.config.beautifier )
        {
            switch( this.config.beautifier )
            {
                case 'js-beautify':
                    var beautify = require('js-beautify').js_beautify;
                    text = beautify( text, this.config.beautifier_options );
                    break;

                default:
                    cmd = this.config.beautifier + file;
                    break;
            }
        }

        if( !global.dryRun )
        {
            fs.writeFile( file, text, function( err ) 
            { 
                if ( err ) 
                { 
                    self.callback( err ); 
                    return; 
                }

                ++internals.written; 
            } );

            log.verbose( file, text );
        }
        else
        {
            ++internals.written;
            log.info( file, text );
        }

        /**
          * We execute your custom beautifier, but don't care about the result.
          * You should ensure security yourself, because this could open a threat to attackers,
          * by modifying your config!
          *
          */
        if( cmd )
            exec( cmd );
    },

    columns: function ( self, db )
    {
        var self = self || this,
            i = 0, kI = 0;

        if ( !internals.diff.fullcolumns )
            internals.diff.fullcolumns = Array();

        var oKeys = Object.keys( db[ 0 ] );
        for ( kI = 0; kI < oKeys.length; ++kI )
        {
            if ( !internals.diff.fullcolumns[ oKeys[ kI ] ] )
                internals.diff.fullcolumns[ oKeys[ kI ] ] = Array();

            internals.diff.fullcolumns[ oKeys[ kI ] ][ 0 ] = db[ 0 ][ oKeys[ kI ] ];
        }

        oKeys = Object.keys( db[ 1 ] );
        for ( kI = 0; kI < oKeys.length; ++kI )
        {
            if ( !internals.diff.fullcolumns[ oKeys[ kI ] ] )
                internals.diff.fullcolumns[ oKeys[ kI ] ] = Array();

            internals.diff.fullcolumns[ oKeys[ kI ] ][ 1 ] = db[ 1 ][ oKeys[ kI ] ];
        }

        if ( !internals.diff.columns )
            internals.diff.columns = Array();

        for ( i = 0; i < internals.avTables.length; ++i )
        {
            var columns = Array(),
                available_columns = Array(),
                chg_columns = Array(),
                len = 0;

            columns = self.diffArr( db[ 0 ][ internals.avTables[ i ] ], db[ 1 ][ internals.avTables[ i ] ] );

            available_columns[ 0 ] = self.buildArr( self.subArr( db[ 0 ][ internals.avTables[ i ] ], columns[ 0 ] ) );
            available_columns[ 1 ] = self.buildArr( self.subArr( db[ 1 ][ internals.avTables[ i ] ], columns[ 1 ] ) );

            if ( available_columns[ 0 ] )
            {
                var oAvKeys = Object.keys( available_columns[ 0 ] );
                for ( kI = 0; kI < oAvKeys.length; ++kI )
                {
                    if ( !available_columns[ 0 ][ oAvKeys[ kI ] ].identicalTo( available_columns[ 1 ][ oAvKeys[ kI ] ] ) )
                        chg_columns[ oAvKeys[ kI ] ] = available_columns[ 1 ][ oAvKeys[ kI ] ];
                }
            }

            internals.diff.columns[ internals.avTables[ i ] ] = [ columns, chg_columns ];
        }

        ++internals.counter;
    },

    indizies: function ( self, db )
    {
        var self = self || this,
            kI = 0, o = 0;

        if ( !internals.diff.tablespecific )
            internals.diff.tablespecific = Array();

        if ( !internals.diff.fullindizies )
            internals.diff.fullindizies = Array();

        internals.diff.fullindizies = db;

        for ( var i = 0; i < internals.avTables.length; ++i )
        {
            var keys = Array(),
                lost_keys = Array(),
                chg_keys = Array(),
                available_keys = Array();

            if ( db[ 0 ][ internals.avTables[ i ] ] || db[ 1 ][ internals.avTables[ i ] ] )
            {
                if ( !internals.diff.tablespecific[ internals.avTables[ i ] ] )
                    internals.diff.tablespecific[ internals.avTables[ i ] ] = Array();

                //diff on oKeys[ kI ] name
                keys = self.diffArr( db[ 0 ][ internals.avTables[ i ] ], db[ 1 ][ internals.avTables[ i ] ] );

                //collecting data
                available_keys[ 0 ] = self.subArr( db[ 0 ][ internals.avTables[ i ] ], keys[ 0 ] );
                available_keys[ 1 ] = self.subArr( db[ 1 ][ internals.avTables[ i ] ], keys[ 1 ] );

                for ( o = 0; o < 2; ++o )
                {
                    available_keys[ o ] = self.buildArr( available_keys[ o ] );

                    if ( available_keys[ o ] )
                    {
                        var oAvKeys = Object.keys( available_keys[ o ] );
                        for ( kI = 0; kI < oAvKeys.length; ++kI )
                        {
                            available_keys[ o ][ oAvKeys[ kI ] ] = self.moveItem( available_keys[ o ][ oAvKeys[ kI ] ], 2, 0 );
                        }
                    }
                }



                new_keys = self.buildArr( keys[ 0 ] );

                if ( new_keys )
                {
                    var oNewKeys = Object.keys( new_keys );

                    for ( kI = 0; kI < oNewKeys.length; ++kI )
                    {
                        new_keys[ oNewKeys[ kI ] ] = self.moveItem( new_keys[ oNewKeys[ kI ] ], 2, 0 );
                    }
                }

                lost_keys = self.buildArr( keys[ 1 ] );

                if ( lost_keys )
                {
                    var oLostKeys = Object.keys( lost_keys );

                    for ( kI = 0; kI < oLostKeys.length; ++kI )
                    {
                        lost_keys[ oLostKeys[ kI ] ] = self.moveItem( lost_keys[ oLostKeys[ kI ] ], 2, 0 );
                    }
                }
                //end collecting

                //diff on oKeys[ kI ] index name
                if ( available_keys[ 0 ] )
                {
                    var oKeys = Object.keys( available_keys[ 0 ] );
                    for ( kI = 0; kI < oKeys.length; ++kI )
                    {
                        var available_keys_chg = Array(),
                            len = 0;

                        var tmp_key = Array();


                        tmp_key = self.diffArr( available_keys[ 0 ][ oKeys[ kI ] ], available_keys[ 1 ][ oKeys[ kI ] ] );

                        available_keys_chg[ 0 ] = self.subArr( available_keys[ 0 ][ oKeys[ kI ] ], tmp_key[ 0 ] );
                        available_keys_chg[ 1 ] = self.subArr( available_keys[ 1 ][ oKeys[ kI ] ], tmp_key[ 1 ] );


                        for ( o = 0; o < 2; ++o )
                        {
                            available_keys_chg[ o ] = self.buildArr( available_keys_chg[ o ] );

                            if ( available_keys_chg[ o ] )
                            {
                                var oChgKeys = Object.keys( available_keys_chg[ o ] );
                                for ( var kOIC = 0; kOIC < oChgKeys.length; ++kOIC )
                                {
                                    available_keys_chg[ o ][ oChgKeys[ kOIC ] ] = self.moveItem( available_keys_chg[ o ][ oChgKeys[ kOIC ] ], 2, 0 );
                                }
                            }
                        }


                        if ( available_keys_chg[ 0 ] )
                        {
                            var oKeysChg = Object.keys( available_keys_chg[ 0 ] );
                            for ( kIC = 0; kIC < oKeysChg.length; ++kIC )
                            {
                                if ( !available_keys_chg[ 0 ][ oKeysChg[ kIC ] ].identicalTo( available_keys_chg[ 1 ][ oKeysChg[ kIC ] ] ) )
                                {  
                                    if ( !chg_keys[ oKeys[ kI ] ] )
                                        chg_keys[ oKeys[ kI ] ] = Array();

                                    if ( !chg_keys[ oKeys[ kI ] ][ oKeysChg[ kIC ] ] )
                                        chg_keys[ oKeys[ kI ] ][ oKeysChg[ kIC ] ] = Array();

                                    chg_keys[ oKeys[ kI ] ][ oKeysChg[ kIC ] ][ 0 ] = available_keys_chg[ 0 ][ oKeysChg[ kIC ] ][ 0 ];
                                    chg_keys[ oKeys[ kI ] ][ oKeysChg[ kIC ] ][ 1 ] = available_keys_chg[ 1 ][ oKeysChg[ kIC ] ][ 0 ];
                                }
                            }
                        }
                    }
                }

                internals.diff.tablespecific[ internals.avTables[ i ] ].indizies = [ new_keys, lost_keys, chg_keys ];
            }
        }

        ++internals.counter;
    },

    foreign_keys: function ( self, db )
    {
        var self = self || this,
            o = 0, kI = 0;

        if ( !internals.diff.tablespecific )
            internals.diff.tablespecific = Array();

        for ( var i = 0; i < internals.avTables.length; ++i )
        {
            var keys = Array(),
                new_keys = Array(),
                chg_keys = Array(),
                lost_keys = Array(), 
                available_keys = Array();

            if ( db[ 0 ][ internals.avTables[ i ] ] || db[ 1 ][ internals.avTables[ i ] ] )
            {
                if ( !internals.diff.tablespecific[ internals.avTables[ i ] ] )
                    internals.diff.tablespecific[ internals.avTables[ i ] ] = Array();

                //diff on oKeys[ kI ] name
                keys = self.diffArr( db[ 0 ][ internals.avTables[ i ] ], db[ 1 ][ internals.avTables[ i ] ] );

                //collecting data
                available_keys[ 0 ] = self.subArr( db[ 0 ][ internals.avTables[ i ] ], keys[ 0 ] );
                available_keys[ 1 ] = self.subArr( db[ 1 ][ internals.avTables[ i ] ], keys[ 1 ] );

                for ( o = 0; o < 2; ++o )
                    available_keys[ o ] = self.buildArr( available_keys[ o ] );

                new_keys = self.buildArr( keys[ 0 ] );
                lost_keys = self.buildArr( keys[ 1 ] );
                //end collecting

                //diff on foreign oKeys[ kI ] column name
                if ( available_keys[ 0 ] )
                {
                    var oKeys = Object.keys( available_keys[ 0 ] );
                    for ( kI = 0; kI < oKeys.length; ++kI )
                    {
                        var available_keys_chg = Array();

                        if ( !chg_keys[ oKeys[ kI ] ] )
                            chg_keys[ oKeys[ kI ] ] = Array();

                        chg_keys[ oKeys[ kI ] ][ 0 ] = self.diffArr( available_keys[ 0 ][ oKeys[ kI ] ], available_keys[ 1 ][ oKeys[ kI ] ] );

                        available_keys_chg[ 0 ] = self.subArr( available_keys[ 0 ][ oKeys[ kI ] ], chg_keys[ oKeys[ kI ] ][ 0 ][ 0 ] );
                        available_keys_chg[ 1 ] = self.subArr( available_keys[ 1 ][ oKeys[ kI ] ], chg_keys[ oKeys[ kI ] ][ 0 ][ 1 ] );

                        for ( o = 0; o < 2; ++o )
                        {
                            available_keys_chg[ o ] = self.buildArr( available_keys_chg[ o ] );

                            if ( available_keys_chg[ o ] )
                            {
                                var oChgKeys = Object.keys( available_keys_chg[ o ] );
                                for ( kI = 0; kI < oChgKeys.length; ++kI )
                                {
                                    available_keys_chg[ o ][ oChgKeys[ kI ] ] = self.moveItem( available_keys_chg[ o ][ oChgKeys[ kI ] ], 2, 0 );
                                }
                            }
                        }

                        if ( available_keys_chg[ 0 ] )
                        {
                            var oKeysChg = Object.keys( available_keys_chg[ 0 ] );
                            for ( kIC = 0; kIC < oKeysChg.length; ++kIC )
                            {
                                var tmp_keys = Array();

                                if ( !chg_keys[ oKeys[ kI ] ][ 1 ] )
                                    chg_keys[ oKeys[ kI ] ][ 1 ] = Array();

                                if ( !available_keys_chg[ 0 ][ oKeysChg[ kIC ] ].identicalTo( available_keys_chg[ 1 ][ oKeysChg[ kIC ] ] ) )
                                {
                                    tmp_keys[ oKeysChg[ kIC ] ][ 0 ] = available_keys_chg[ 0 ][ oKeysChg[ kIC ] ];
                                    tmp_keys[ oKeysChg[ kIC ] ][ 1 ] = available_keys_chg[ 1 ][ oKeysChg[ kIC ] ];
                                    chg_keys[ oKeys[ kI ] ][ 1 ].push( tmp_keys );
                                }
                            }
                        }
                    }
                }

                internals.diff.tablespecific[ internals.avTables[ i ] ].foreign_keys = [ new_keys, lost_keys, chg_keys ];
            }
        }

        ++internals.counter;
    },

    engines: function ( self, db )
    {
        var self = self || this;

        if ( !internals.diff.tablespecific )
            internals.diff.tablespecific = Array();

        db[ 0 ] = self.buildArr( db[ 0 ] );
        db[ 1 ] = self.buildArr( db[ 1 ] );

        if ( !internals.diff.fullengines )
            internals.diff.fullengines = Array();

        internals.diff.fullengines[ 0 ] = db[ 0 ];
        internals.diff.fullengines[ 1 ] = db[ 1 ];

        for ( var i = 0; i < internals.avTables.length; ++i )
        {
            var engine = '',
                chg_engine = '';

            if ( db[ 0 ][ internals.avTables[ i ] ] || db[ 1 ][ internals.avTables[ i ] ] )
            {
                if ( !internals.diff.tablespecific[ internals.avTables[ i ] ] )
                    internals.diff.tablespecific[ internals.avTables[ i ] ] = Array();

                if ( db[ 1 ][ internals.avTables[ i ] ] )
                {
                    if ( db[ 0 ][ internals.avTables[ i ] ][ 0 ][ 0 ] !== db[ 1 ][ internals.avTables[ i ] ][ 0 ][ 0 ] )
                    {
                        engine = db[ 1 ][ internals.avTables[ i ] ][ 0 ][ 0 ];
                        chg_engine = db[ 0 ][ internals.avTables[ i ] ][ 0 ][ 0 ];
                    }
                    else
                        engine = db[ 0 ][ internals.avTables[ i ] ][ 0 ][ 0 ];
                }
                else
                    engine = db[ 0 ][ internals.avTables[ i ] ][ 0 ][ 0 ];

                internals.diff.tablespecific[ internals.avTables[ i ] ].engine = [ engine, chg_engine ];
            }
        }

        ++internals.counter;
    },

    /**
     * Subtracts matching Items from array.
     *
     * @return array
     */
    subArr: function ( arr, sub )
    {
        var substracted = Array(),
            i = 0;

        if ( !arr )
            return arr;

        var tmp = Array();
        if ( typeof ( arr[ 0 ] ) === 'object' )
        {
            tmp[ 0 ] = Array();
            tmp[ 1 ] = Array();
            for ( i = 0; i < arr.length; ++i )
            {
                if ( arr.length > i )
                    tmp[ 0 ].push( arr[ i ][ 0 ] );

                if ( sub.length > i )
                    tmp[ 1 ].push( sub[ i ][ 0 ] );
            }
        }
        else
        {
            tmp[ 0 ] = arr;
            tmp[ 1 ] = sub;
        }


        for ( i = 0; i < arr.length; ++i )
        {
            if ( tmp[ 1 ].indexOf( tmp[ 0 ][ i ] ) === -1 )
                substracted.push( arr[ i ] );
        }

        return substracted;
    },

    /**
     * Returns an array of all matching elements from both arrays.
     *
     * @return array
     */
    matchArr: function ( arr, match )
    {
        var matched = Array(),
            i = 0;

        if ( !arr )
            return arr;

        var tmp = Array();
        if ( typeof ( arr[ 0 ] ) === 'object' )
        {
            tmp[ 0 ] = Array();
            tmp[ 1 ] = Array();
            for ( i = 0; i < arr.length; ++i )
            {
                if ( arr.length > i )
                    tmp[ 0 ].push( arr[ i ][ 0 ] );

                if ( match.length > i )
                    tmp[ 1 ].push( match[ i ][ 0 ] );
            }
        }
        else
        {
            tmp[ 0 ] = arr;
            tmp[ 1 ] = match;
        }

        for ( i = 0; i < arr.length; ++i )
        {
            if ( tmp[ 1 ].indexOf( tmp[ 0 ][ i ] ) !== -1 )
                matched.push( arr[ i ] );
        }

        return matched;
    },

    /**
     * Builds an array out of all matching elements of provided index.
     * Index defaults to zero if not specified.
     *
     * @return array
     */
    buildArr: function ( arr, index )
    {
        var index = index || 0,
            builded = Array();

        if ( !arr )
            return arr;

        for ( var i = 0; i < arr.length; ++i )
        {
            var copy = arr[ i ].slice();
            copy.splice( index, 1 );
            var in_index = arr[ i ][ index ];
            if ( !builded[ in_index ] )
                builded[ in_index ] = Array();

            builded[ in_index ].push( copy );
        }

        return builded;
    },

    /**
     * Moves an index within an array to another position, for all array elements.
     *
     * @return array
     */
    moveItem: function ( arr, index, position, overwrite )
    {
        var overwrite = overwrite || false,
            inc = ( overwrite ) ? 1 : 2,
            moved = Array();

        for ( var i = 0; i < arr.length; ++i )
        {
            moved[ i ] = Array();

            for ( var o = 0; o < arr[ i ].length; ++o )
            {
                if ( i < position )
                    moved[ i ][ o ] = arr[ i ][ o ];
                else if ( o === position )
                {
                    moved[ i ][ o ] = arr[ i ][ index ];
                    if ( !overwrite )
                        moved[ i ][ o + 1 ] = arr[ i ][ o ];
                }
                else if ( o < index )
                    moved[ i ][ o + inc ] = arr[ i ][ o ];
                else if ( o === index )
                    moved[ i ][ o ] = arr[ i ][ o - 1 ];
                else
                    moved[ i ][ o ] = arr[ i ][ o ];
            }
        }

        return moved;
    },

    /**
     * Makes a diff between arr and diff and sorts it in deleted
     * and available.
     *
     * Array [0] = added, [1] = deleted
     *
     * @return array
     */
    diffArr: function ( arr, diff )
    {
        var differences = Array(),
            i = 0;

        differences[ 0 ] = Array();
        differences[ 1 ] = Array();

        if ( !diff )
        {
            differences[ 0 ] = arr;
        }
        else if ( !arr )
        {
            differences[ 1 ] = diff;
        }
        else if ( arr )
        {
            var tmp = Array();
            var len = ( diff.length > arr.length ) ? diff.length : arr.length;
            if ( typeof ( arr[ 0 ] ) === 'object' )
            {
                tmp[ 0 ] = Array();
                tmp[ 1 ] = Array();
                for ( i = 0; i < len; ++i )
                {
                    if ( arr.length > i )
                        tmp[ 0 ].push( arr[ i ][ 0 ] );

                    if ( diff.length > i )
                        tmp[ 1 ].push( diff[ i ][ 0 ] );
                }
            }
            else
            {
                tmp[ 0 ] = arr;
                tmp[ 1 ] = diff;
            }

            for ( i = 0; i < len; ++i )
            {
                if ( tmp[ 1 ].length > i && tmp[ 0 ].indexOf( tmp[ 1 ][ i ] ) === -1 )
                    differences[ 1 ].push( diff[ i ] );

                if ( tmp[ 0 ].length > i && tmp[ 1 ].indexOf( tmp[ 0 ][ i ] ) === -1 )
                    differences[ 0 ].push( arr[ i ] );
            }
        }

        return differences;
    },

    close: function ()
    {
        if ( internals.driver )
            internals.driver.close();
    }

};
module.exports = Builder;