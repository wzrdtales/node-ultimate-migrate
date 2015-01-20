var log = require( 'db-migrate/lib/log' );
var deasync = require( 'deasync' );
var fs = require( 'fs' );
var sys = require( 'sys' );
var exec = require( 'child_process' ).exec;

var internals = 
{

    _caps: 
    {

        getTables: [ [ 'tables', 'views' ], 3 ],
        getFn: [ [ 'functions', 'procedures' ], 1 ]
    }
};

Builder = function ( driver, template, migrationsDir, config )
{
    internals.counter       = 0;
    internals.template      = template;
    internals.diff          = [];
    internals.avTables      = [];
    internals.driver        = driver;
    internals.max           = 6; //7-8
    internals.migrationsDir = migrationsDir + '/';
    internals.written       = 0;
    internals.config        = config;

    require( './util' );
};

function formatName( filestring, tables, action, incrementor, date )
{
    var title = filestring.replace( /%filename%/i, tables );
    title = title.replace( /%action%/i, action );

    return formatDate( new Date( date.getTime() + ( 1000 * incrementor ) ) ) + '-' + title;
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

        internals.callback = callback;
        internals.config   = config;

        var caps = internals.driver.capabilities;
        log.verbose( 'Driver provides:', caps );

        self.checkCap( 'getTables', true, function()
        {
            internals.driver.getTables( config, function ( db )
            {
                if ( db[ 0 ].length !== 0 &&
                    ( db[ 1 ].length !== 0 || config.diffDump ) )
                {
                    internals.diff.tables = self.diffArr( db[ 0 ][ 0 ], db[ 1 ][ 0 ] );
                    internals.diff.views  = self.diffArr( db[ 0 ][ 1 ], db[ 1 ][ 1 ] );

                    var tableList = [];
                    tableList.tables = [ db[ 0 ][ 0 ], db[ 1 ][ 0 ] ];
                    tableList.views  = [ db[ 0 ][ 1 ], db[ 1 ][ 1 ] ];

                    internals.avTables    = self.subArr( db[ 0 ][ 0 ], internals.diff.tables[ 1 ] );

                    internals.driver.getColumns( config, tableList, self, self.columns );
                    self.checkCap( 'indizies', true, function()
                    {
                        internals.driver.getIndizies( config, tableList, self, self.indizies );
                    } );

                    self.checkCap( 'engines', true, function()
                    {
                        internals.driver.getEngine( config, self, self.engines );
                    } );

                    self.checkCap( 'foreign_keys', true, function()
                    {
                        internals.driver.getFK( config, tableList, self, self.foreign_keys );
                    } );

                }

                ++internals.counter;
            } );
        } );

        self.checkCap( 'getFn', true, function()
        {
            internals.driver.getFn( config, function ( db, dbdiff )
            {
                if ( db.length !== 0 &&
                    ( dbdiff.length !== 0 || config.diffDump ) )
                {
                    //ToDo: We don't only want to check if it exist or not,
                    //but to check if it was modified. For this purpose
                    //we need additional information so I'm going to 
                    //modify the way how db-migrate behaves.
                    //
                    //For now this implementation wont take any action, later.
                    internals.diff.fn = self.diffArr( db, dbdiff );
                }

                ++internals.counter;
            } );
        } );


        while ( internals.counter < internals.max ) deasync.sleep( 100 );

        down( function() 
        { 
            self.templating( config );
        } );

        log.verbose( 'Collected Data Overview:', internals.diff );
    },


    /**
      * More comfortable to maintain and test method for available capabilities.
      *
      * @return boolean
      */
    checkCap: function ( capability, decrease, callback )
    {
        var _caps = internals._caps[ capability ];

        if( typeof( decrease ) === 'function' )
        {
            callback = decrease;
            decrease = false;
        }

        if ( !_caps )
        {
            if ( internals.driver.capabilities.indexOf( capability ) !== -1 )
            {
                callback();

                return true;
            }
        }
        else
        {
            for ( var i = 0; i < _caps[ 0 ].length; ++i )
            {
                if ( internals.driver.capabilities.indexOf( _caps[ 0 ][ i ] ) !== -1 )
                {
                    callback();

                    return true;
                }
            }

            if( decrease )
                internals.max -= _caps[ 1 ];

            return false;
        }

        if( decrease )
            --internals.max;

        return false;
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
            // triggers = internals.diff['triggers'],
            fColumns = internals.diff.fullcolumns,
            fEngines = internals.diff.fullengines,
            fKeys = internals.diff.fullindizies,
            inc = 0, i = 0, kI = 0,
            caps = internals.driver.capabilities,
            file = '';

        // begin creating section
        // created tables

        self.checkCap( 'tables', function()
        {
            for ( i = 0; i < tables[ 0 ].length; ++i )
            {
                file = formatName( config.filestring, tables[ 0 ][ i ], 'createTable', inc++, new Date() );

                self.write( file, internals.template.table( tables[ 0 ][ i ], fColumns[ tables[ 0 ][ i ] ][ 0 ] ) );
            }
        } );            


        self.checkCap( 'engines', function()
        {
            for ( i = 0; i < tables[ 0 ].length; ++i )
            {
                file = formatName( config.filestring, tables[ 0 ][ i ], 'setEngine', inc++, new Date() );
                self.write( file, internals.template.engine( tables[ 0 ][ i ], fEngines[ 0 ][ tables[ 0 ][ i ] ] ) );
            }
        } );

        self.checkCap( 'indizies', function()
        {
            for ( i = 0; i < tables[ 0 ].length; ++i )
            {
            
                if( fKeys[ 0 ][ tables[ 0 ][ i ] ] && fKeys[ 0 ][ tables[ 0 ][ i ] ].length > 0 )
                {
                    file = formatName( config.filestring, tables[ 0 ][ i ], 'setKeys', inc++, new Date() );
                    self.write( file, internals.template.keys( tables[ 0 ][ i ], 
                        self.buildArr( 
                            self.moveItem( 
                                fKeys[ 0 ][ tables[ 0 ][ i ] ], 3, 1
                            ) 
                        ), false, 0 
                    ) );
                }
            }
        } );

        var oKeys = Object.keys( columns );

        self.checkCap( 'columns', function()
        {
            for ( kI = 0; kI < oKeys.length; ++kI )
            {
                if ( tables[ 0 ].indexOf( oKeys[ kI ] ) !== -1 || tables[ 1 ].indexOf( oKeys[ kI ] ) !== -1 )
                    continue;

                // added columns
                if ( columns[ oKeys[ kI ] ][ 0 ][ 0 ] && columns[ oKeys[ kI ] ][ 0 ][ 0 ].length > 0 )
                {
                    file = formatName( config.filestring, oKeys[ kI ], 'addColumns', inc++, new Date() );
                    self.write( file, internals.template.columns( oKeys[ kI ], columns[ oKeys[ kI ] ][ 0 ][ 0 ] ) );

                    // self.write( file, internals.template.table( tables[0][i], fColumns[tables[0][i]][0] ) );
                }
            }
        } );

        oKeys = Object.keys( tsp );
        self.checkCap( 'indizies', function()
        {
            for ( kI = 0; kI < oKeys.length; ++kI )
            {
                if ( tables[ 0 ].indexOf( oKeys[ kI ] ) !== -1 || tables[ 1 ].indexOf( oKeys[ kI ] ) !== -1 )
                    continue;


                
                // changing oKeys[ kI ]
                // tsp[oKeys[ kI ]]
                if ( tsp[ oKeys[ kI ] ].indizies )
                {
                    if ( Object.keys( tsp[ oKeys[ kI ] ].indizies[ 2 ] ).length )
                    {
                        file = formatName( config.filestring, oKeys[ kI ], 'changeKeys', inc++, new Date() );
                        self.write( file, internals.template.changeKeys( oKeys[ kI ], 
                            tsp[ oKeys[ kI ] ].indizies[ 2 ], false, 1 ) );
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
            }
        } );


        self.checkCap( 'engines', function()
        {
            for ( kI = 0; kI < oKeys.length; ++kI )
            {
                if ( tables[ 0 ].indexOf( oKeys[ kI ] ) !== -1 || tables[ 1 ].indexOf( oKeys[ kI ] ) !== -1 )
                    continue;
                
                // changing engine
                if ( tsp[ oKeys[ kI ] ].engine && tsp[ oKeys[ kI ] ].engine[ 1 ] )
                {
                    file = formatName( config.filestring, oKeys[ kI ], 'changeEngine', inc++, new Date() );
                    self.write( file, internals.template.engine( oKeys[ kI ], tsp[ oKeys[ kI ] ].engine ) );
                }

            }
        } );

        // end creation section

        // begin dropping section
        // dropped tables
        self.checkCap( 'indizies', function()
        {
            for ( i = 0; i < tables[ 1 ].length; ++i )
            {
                
                file = formatName( config.filestring, tables[ 1 ][ i ], 'dropKeys', inc++, new Date() );
                self.write( file, internals.template.keys( tables[ 1 ][ i ], 
                    self.buildArr( 
                        self.moveItem( 
                            fKeys[ 1 ][ tables[ 1 ][ i ] ], 3, 1
                        ) 
                    ), true, 0 
                ) );
            }
        } );

        self.checkCap( 'engines', function()
        {
            for ( i = 0; i < tables[ 1 ].length; ++i )
            {
                
                file = formatName( config.filestring, tables[ 1 ][ i ], 'dropEngine', inc++, new Date() );
                self.write( file, internals.template.engine( tables[ 1 ][ i ], fEngines[ 1 ][ tables[ 1 ][ i ] ], true ) );
            }
        } );

        self.checkCap( 'tables', function()
        {
            for ( i = 0; i < tables[ 1 ].length; ++i )
            {        
                file = formatName( config.filestring, tables[ 1 ][ i ], 'dropTable', inc++, new Date() );
                self.write( file, internals.template.table( tables[ 1 ][ i ], fColumns[ tables[ 1 ][ i ] ][ 1 ], true ) );
            }
        } );


        self.checkCap( 'columns', function()
        {
            oKeys = Object.keys( columns );
            for ( kI = 0; kI < oKeys.length; ++kI )
            {
                if ( tables[ 0 ].indexOf( oKeys[ kI ] ) !== -1 || tables[ 1 ].indexOf( oKeys[ kI ] ) !== -1 )
                    continue;
                
                // dropped columns
                if ( columns[ oKeys[ kI ] ][ 0 ][ 1 ] && columns[ oKeys[ kI ] ][ 0 ][ 1 ].length > 0 )
                {
                    file = formatName( config.filestring, oKeys[ kI ], 'dropColumns', inc++, new Date() );
                    self.write( file, internals.template.columns( oKeys[ kI ], columns[ oKeys[ kI ] ][ 0 ][ 1 ], true ) );

                    // self.write( file, internals.template.table( tables[0][i], fColumns[tables[0][i]][0] ) );
                }
            }
        } );

        while ( inc > internals.written ) deasync.sleep( 100 );

        internals.callback();

    },

    assert: function( condition, level, message )
    {

        if( typeof( level ) === 'string' )
        {
            message = level;
            level = { critical: false };
        }

        if( !condition )
        {
            return true;
        }

        log.error( message );

        if( level.critical )
            throw ( condition );

        return false;
    },

    /**
      * Writes to file or console.
      *
      * @return string | boolean
      */
    write: function ( file, text, self ) 
    {
        var cmd = null, 
        self = self || this;

        file = internals.migrationsDir + file;

        if( !file | !text )
        {
            ++internals.written;
            log.verbose( 'Error! Content of following file was empty: ' + file );
            return false;
        }

        if( internals.config.beautifier )
        {
            switch( internals.config.beautifier )
            {
                case 'js-beautify':
                    var beautify = require( 'js-beautify' ).js_beautify;
                    text = beautify( text, internals.config.beautifier_options );
                    break;

                default:
                    cmd = internals.config.beautifier + ' ' + file;
                    break;
            }
        }

        if( !global.dryRun )
        {
            fs.writeFile( file, text, function( err ) 
            { 
                self.assert( err, { critical: true }, 'Write to file failed!' );

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
        {
            exec( cmd, function ( error, stdout, stderr ) 
            {
                self.assert( error, stderr );
                text = stdout;
            } );
        }

        return text;
    },

    columns: function ( self, db )
    {
        var self = self || this,
            i = 0, kI = 0;

        if ( !internals.diff.fullcolumns )
            internals.diff.fullcolumns = [];

        var oKeys = Object.keys( db[ 0 ] );
        for ( kI = 0; kI < oKeys.length; ++kI )
        {
            if ( !internals.diff.fullcolumns[ oKeys[ kI ] ] )
                internals.diff.fullcolumns[ oKeys[ kI ] ] = [];

            internals.diff.fullcolumns[ oKeys[ kI ] ][ 0 ] = db[ 0 ][ oKeys[ kI ] ];
        }

        oKeys = Object.keys( db[ 1 ] );
        for ( kI = 0; kI < oKeys.length; ++kI )
        {
            if ( !internals.diff.fullcolumns[ oKeys[ kI ] ] )
                internals.diff.fullcolumns[ oKeys[ kI ] ] = [];

            internals.diff.fullcolumns[ oKeys[ kI ] ][ 1 ] = db[ 1 ][ oKeys[ kI ] ];
        }

        if ( !internals.diff.columns )
            internals.diff.columns = [];

        for ( i = 0; i < internals.avTables.length; ++i )
        {
            var columns = [],
                availableColumns = [],
                chgColumns = [],
                len = 0;

            columns = self.diffArr( db[ 0 ][ internals.avTables[ i ] ], db[ 1 ][ internals.avTables[ i ] ] );

            availableColumns[ 0 ] = self.buildArr( self.subArr( db[ 0 ][ internals.avTables[ i ] ], columns[ 0 ] ) );
            availableColumns[ 1 ] = self.buildArr( self.subArr( db[ 1 ][ internals.avTables[ i ] ], columns[ 1 ] ) );

            if ( availableColumns[ 0 ] )
            {
                var oAvKeys = Object.keys( availableColumns[ 0 ] );
                for ( kI = 0; kI < oAvKeys.length; ++kI )
                {
                    if ( !availableColumns[ 0 ][ oAvKeys[ kI ] ].identicalTo( availableColumns[ 1 ][ oAvKeys[ kI ] ] ) )
                        chgColumns[ oAvKeys[ kI ] ] = availableColumns[ 1 ][ oAvKeys[ kI ] ];
                }
            }

            internals.diff.columns[ internals.avTables[ i ] ] = [ columns, chgColumns ];
        }

        ++internals.counter;
    },

    indizies: function ( self, db )
    {
        var self = self || this,
            kI = 0, o = 0;

        if ( !internals.diff.tablespecific )
            internals.diff.tablespecific = [];

        if ( !internals.diff.fullindizies )
            internals.diff.fullindizies = [];

        internals.diff.fullindizies = db;

        for ( var i = 0; i < internals.avTables.length; ++i )
        {
            var keys = [],
                newKeys = [],
                lostKeys = [],
                chgKeys = [],
                availableKeys = [];

            if ( db[ 0 ][ internals.avTables[ i ] ] || db[ 1 ][ internals.avTables[ i ] ] )
            {
                if ( !internals.diff.tablespecific[ internals.avTables[ i ] ] )
                    internals.diff.tablespecific[ internals.avTables[ i ] ] = [];

                // diff on oKeys[ kI ] name
                keys = self.diffArr( db[ 0 ][ internals.avTables[ i ] ], db[ 1 ][ internals.avTables[ i ] ] );

                // collecting data
                availableKeys[ 0 ] = self.subArr( db[ 0 ][ internals.avTables[ i ] ], keys[ 0 ] );
                availableKeys[ 1 ] = self.subArr( db[ 1 ][ internals.avTables[ i ] ], keys[ 1 ] );

                for ( o = 0; o < 2; ++o )
                {
                    availableKeys[ o ] = self.buildArr( availableKeys[ o ] );

                    if ( availableKeys[ o ] )
                    {
                        var oAvKeys = Object.keys( availableKeys[ o ] );
                        for ( kI = 0; kI < oAvKeys.length; ++kI )
                        {
                            availableKeys[ o ][ oAvKeys[ kI ] ] = self.moveItem( availableKeys[ o ][ oAvKeys[ kI ] ], 2, 0 );
                        }
                    }
                }



                newKeys = self.buildArr( keys[ 0 ] );

                if ( newKeys )
                {
                    var oNewKeys = Object.keys( newKeys );

                    for ( kI = 0; kI < oNewKeys.length; ++kI )
                    {
                        newKeys[ oNewKeys[ kI ] ] = self.moveItem( newKeys[ oNewKeys[ kI ] ], 2, 0 );
                    }
                }

                lostKeys = self.buildArr( keys[ 1 ] );

                if ( lostKeys )
                {
                    var oLostKeys = Object.keys( lostKeys );

                    for ( kI = 0; kI < oLostKeys.length; ++kI )
                    {
                        lostKeys[ oLostKeys[ kI ] ] = self.moveItem( lostKeys[ oLostKeys[ kI ] ], 2, 0 );
                    }
                }
                // end collecting

                // diff on oKeys[ kI ] index name
                if ( availableKeys[ 0 ] )
                {
                    var oKeys = Object.keys( availableKeys[ 0 ] );
                    for ( kI = 0; kI < oKeys.length; ++kI )
                    {
                        var availableKeysChg = [],
                            len = 0,
                            kIC = 0;

                        var tmpKey = [];


                        tmpKey = self.diffArr( availableKeys[ 0 ][ oKeys[ kI ] ], availableKeys[ 1 ][ oKeys[ kI ] ] );

                        availableKeysChg[ 0 ] = self.subArr( availableKeys[ 0 ][ oKeys[ kI ] ], tmpKey[ 0 ] );
                        availableKeysChg[ 1 ] = self.subArr( availableKeys[ 1 ][ oKeys[ kI ] ], tmpKey[ 1 ] );


                        for ( o = 0; o < 2; ++o )
                        {
                            availableKeysChg[ o ] = self.buildArr( availableKeysChg[ o ] );

                            if ( availableKeysChg[ o ] )
                            {
                                var oChgKeys = Object.keys( availableKeysChg[ o ] );
                                for ( var kOIC = 0; kOIC < oChgKeys.length; ++kOIC )
                                {
                                    availableKeysChg[ o ][ oChgKeys[ kOIC ] ] = self.moveItem( 
                                        availableKeysChg[ o ][ oChgKeys[ kOIC ] ], 2, 0 
                                    );
                                }
                            }
                        }


                        if ( availableKeysChg[ 0 ] )
                        {
                            var oKeysChg = Object.keys( availableKeysChg[ 0 ] );
                            for ( kIC = 0; kIC < oKeysChg.length; ++kIC )
                            {
                                if ( !availableKeysChg[ 0 ][ oKeysChg[ kIC ] ].identicalTo( 
                                        availableKeysChg[ 1 ][ oKeysChg[ kIC ] ] ) 
                                    )
                                {  
                                    if ( !chgKeys[ oKeys[ kI ] ] )
                                        chgKeys[ oKeys[ kI ] ] = [];

                                    if ( !chgKeys[ oKeys[ kI ] ][ oKeysChg[ kIC ] ] )
                                        chgKeys[ oKeys[ kI ] ][ oKeysChg[ kIC ] ] = [];

                                    chgKeys[ oKeys[ kI ] ][ oKeysChg[ kIC ] ][ 0 ] = 
                                        availableKeysChg[ 0 ][ oKeysChg[ kIC ] ][ 0 ];

                                    chgKeys[ oKeys[ kI ] ][ oKeysChg[ kIC ] ][ 1 ] = 
                                        availableKeysChg[ 1 ][ oKeysChg[ kIC ] ][ 0 ];
                                }
                            }
                        }
                    }
                }

                internals.diff.tablespecific[ internals.avTables[ i ] ].indizies = [ newKeys, lostKeys, chgKeys ];
            }
        }

        ++internals.counter;
    },

    foreign_keys: function ( self, db )
    {
        var self = self || this,
            o = 0, kI = 0;

        if ( !internals.diff.tablespecific )
            internals.diff.tablespecific = [];

        for ( var i = 0; i < internals.avTables.length; ++i )
        {
            var keys = [],
                newKeys = [],
                chgKeys = [],
                lostKeys = [], 
                availableKeys = [];

            if ( db[ 0 ][ internals.avTables[ i ] ] || db[ 1 ][ internals.avTables[ i ] ] )
            {
                if ( !internals.diff.tablespecific[ internals.avTables[ i ] ] )
                    internals.diff.tablespecific[ internals.avTables[ i ] ] = [];

                // diff on oKeys[ kI ] name
                keys = self.diffArr( db[ 0 ][ internals.avTables[ i ] ], db[ 1 ][ internals.avTables[ i ] ] );

                // collecting data
                availableKeys[ 0 ] = self.subArr( db[ 0 ][ internals.avTables[ i ] ], keys[ 0 ] );
                availableKeys[ 1 ] = self.subArr( db[ 1 ][ internals.avTables[ i ] ], keys[ 1 ] );

                for ( o = 0; o < 2; ++o )
                {
                    availableKeys[ o ] = self.buildArr( availableKeys[ o ] );
                }

                newKeys = self.buildArr( keys[ 0 ] );
                lostKeys = self.buildArr( keys[ 1 ] );
                // end collecting

                // diff on foreign oKeys[ kI ] column name
                if ( availableKeys[ 0 ] )
                {
                    var oKeys = Object.keys( availableKeys[ 0 ] );
                    for ( kI = 0; kI < oKeys.length; ++kI )
                    {
                        var availableKeysChg = [];

                        if ( !chgKeys[ oKeys[ kI ] ] )
                            chgKeys[ oKeys[ kI ] ] = [];

                        chgKeys[ oKeys[ kI ] ][ 0 ] = self.diffArr( 
                            availableKeys[ 0 ][ oKeys[ kI ] ], 
                            availableKeys[ 1 ][ oKeys[ kI ] ] 
                        );

                        availableKeysChg[ 0 ] = self.subArr( 
                            availableKeys[ 0 ][ oKeys[ kI ] ], 
                            chgKeys[ oKeys[ kI ] ][ 0 ][ 0 ] 
                        );

                        availableKeysChg[ 1 ] = self.subArr( 
                            availableKeys[ 1 ][ oKeys[ kI ] ], 
                            chgKeys[ oKeys[ kI ] ][ 0 ][ 1 ] 
                        );

                        for ( o = 0; o < 2; ++o )
                        {
                            availableKeysChg[ o ] = self.buildArr( availableKeysChg[ o ] );

                            if ( availableKeysChg[ o ] )
                            {
                                var oChgKeys = Object.keys( availableKeysChg[ o ] );
                                for ( kI = 0; kI < oChgKeys.length; ++kI )
                                {
                                    availableKeysChg[ o ][ oChgKeys[ kI ] ] = 
                                        self.moveItem( availableKeysChg[ o ][ oChgKeys[ kI ] ], 2, 0 );
                                }
                            }
                        }

                        if ( availableKeysChg[ 0 ] )
                        {
                            var oKeysChg = Object.keys( availableKeysChg[ 0 ] );
                            for ( kIC = 0; kIC < oKeysChg.length; ++kIC )
                            {
                                var tmpKeys = [];

                                if ( !chgKeys[ oKeys[ kI ] ][ 1 ] )
                                    chgKeys[ oKeys[ kI ] ][ 1 ] = [];

                                if ( !availableKeysChg[ 0 ][ oKeysChg[ kIC ] ].identicalTo( 
                                        availableKeysChg[ 1 ][ oKeysChg[ kIC ] ] ) 
                                    )
                                {
                                    tmpKeys[ oKeysChg[ kIC ] ][ 0 ] = availableKeysChg[ 0 ][ oKeysChg[ kIC ] ];
                                    tmpKeys[ oKeysChg[ kIC ] ][ 1 ] = availableKeysChg[ 1 ][ oKeysChg[ kIC ] ];
                                    chgKeys[ oKeys[ kI ] ][ 1 ].push( tmpKeys );
                                }
                            }
                        }
                    }
                }

                internals.diff.tablespecific[ internals.avTables[ i ] ].foreign_keys = [ newKeys, lostKeys, chgKeys ];
            }
        }

        ++internals.counter;
    },

    engines: function ( self, db )
    {
        var self = self || this;

        internals.diff.tablespecific = internals.diff.tablespecific || [];

        db[ 0 ] = self.buildArr( db[ 0 ] );
        db[ 1 ] = self.buildArr( db[ 1 ] );

        internals.diff.fullengines = internals.diff.fullengines || [];

        internals.diff.fullengines[ 0 ] = db[ 0 ];
        internals.diff.fullengines[ 1 ] = db[ 1 ];

        for ( var i = 0; i < internals.avTables.length; ++i )
        {
            var engine = '',
                chgEngine = '';

            if ( db[ 0 ][ internals.avTables[ i ] ] || db[ 1 ][ internals.avTables[ i ] ] )
            {
                if ( !internals.diff.tablespecific[ internals.avTables[ i ] ] )
                    internals.diff.tablespecific[ internals.avTables[ i ] ] = [];

                if ( db[ 1 ][ internals.avTables[ i ] ] )
                {
                    if ( db[ 0 ][ internals.avTables[ i ] ][ 0 ][ 0 ] !== db[ 1 ][ internals.avTables[ i ] ][ 0 ][ 0 ] )
                    {
                        engine = db[ 1 ][ internals.avTables[ i ] ][ 0 ][ 0 ];
                        chgEngine = db[ 0 ][ internals.avTables[ i ] ][ 0 ][ 0 ];
                    }
                    else
                    {
                        engine = db[ 0 ][ internals.avTables[ i ] ][ 0 ][ 0 ];
                    }
                }
                else
                {
                    engine = db[ 0 ][ internals.avTables[ i ] ][ 0 ][ 0 ];
                }

                internals.diff.tablespecific[ internals.avTables[ i ] ].engine = [ engine, chgEngine ];
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
        var substracted = [],
            i = 0;

        if ( !arr )
            return arr;

        var tmp = [];
        if ( typeof ( arr[ 0 ] ) === 'object' )
        {
            tmp[ 0 ] = [];
            tmp[ 1 ] = [];
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
        var matched = [],
            i = 0;

        if ( !arr )
            return arr;

        var tmp = [];
        if ( typeof ( arr[ 0 ] ) === 'object' )
        {
            tmp[ 0 ] = [];
            tmp[ 1 ] = [];
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
            builded = {};

        if ( !arr )
            return arr;

        for ( var i = 0; i < arr.length; ++i )
        {
            var copy = arr[ i ].slice();
            copy.splice( index, 1 );
            var inIndex = arr[ i ][ index ];
            if ( !builded[ inIndex ] )
                builded[ inIndex ] = [];

            builded[ inIndex ].push( copy );
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
            inc = ( overwrite ) ? 0 : 1,
            moved = [];

        if( index === position )
            return arr;

        for ( var i = 0; i < arr.length; ++i )
        {
            moved[ i ] = [];

            if( index > position )
            {

                for ( var o = 0; o < arr[ i ].length; ++o )
                {
                
                    if ( o < position )
                        moved[ i ][ o ] = arr[ i ][ o ];
                    else if ( o === position )
                    {
                        moved[ i ][ o ] = arr[ i ][ index ];
                        if ( !overwrite )
                            moved[ i ][ o + 1 ] = arr[ i ][ o ];
                    }
                    else if ( o < index )
                    {
                        moved[ i ][ o + inc ] = arr[ i ][ o ];
                    }
                    else if ( o === index && !overwrite )
                    {
                        moved[ i ][ o ] = arr[ i ][ o - 1 ];
                    }
                    else if ( !overwrite )
                    {
                        moved[ i ][ o ] = arr[ i ][ o ];
                    }
                    else if ( o + 1 < arr[ i ].length )
                    {
                        moved[ i ][ o ] = arr[ i ][ o + 1 ];
                    }
                }
            }
            else
            {

                for ( var o = 0; o < arr[ i ].length; ++o )
                {
                
                    if ( o < index )
                        moved[ i ][ o ] = arr[ i ][ o ];
                    else if ( ( o === position && !overwrite ) || ( overwrite && o + 1 === position ) )
                    {
                        moved[ i ][ o ] = arr[ i ][ index ];
                        if ( !overwrite )
                            moved[ i ][ o - 1 ] = arr[ i ][ o ];
                    }
                    else if ( o === index )
                    {
                        moved[ i ][ o ] = arr[ i ][ o + 1 ];
                    }
                    else if ( o < position )
                    {
                        moved[ i ][ o ] = arr[ i ][ o + 1 ];
                    }
                    else if ( !overwrite )
                    {
                        moved[ i ][ o ] = arr[ i ][ o ];
                    }
                    else if ( o + 1 < arr[ i ].length )
                    {
                        moved[ i ][ o ] = arr[ i ][ o + 1 ];
                    }
                }   
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
        var differences = [],
            i = 0;

        differences[ 0 ] = [];
        differences[ 1 ] = [];

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
            var tmp = [];
            var len = ( diff.length > arr.length ) ? diff.length : arr.length;
            if ( typeof ( arr[ 0 ] ) === 'object' )
            {
                tmp[ 0 ] = [];
                tmp[ 1 ] = [];
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