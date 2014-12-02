var Mariasql = require( 'mariasql' );
var log = require( 'db-migrate/lib/log' );
var util = require( 'util' );
var deasync = require( 'deasync' );
var BaseDriver = require( './base' );

util.inherits( MariasqlDriver, BaseDriver );

function MariasqlDriver( connection )
{
    this.capabilities = [
        'tables', 'views', 'functions', 'procedures',
        'indizies', 'foreign_keys', 'engines', 'columns'
    ];
    this.connection = connection;
}

MariasqlDriver.prototype = {


    /**
     * Returns an array containing the Tables.
     *
     * General return information:
     *
     * This array has 2 layers, the final information layer has
     * 8 elements.
     *
     * Array Format:
     * Layer 1:
     * [0] = real table, [1] = diff table
     *
     * Layer 3 (Result formatting):
     * [0] = table array*, [1] = view array*
     *
     * Table Array (Content)
     * List of table name per array element
     *
     * View Array (Content)
     * List of view name per array element
     *
     * @return array
     */
    getTables: function ( config, callback )
    {
        var self = this;
        var db = Array(),
            diff = Array(),
            first = true;

        for( var c = 0; c < 2; ++c )
        {
            db[ c ] = Array();

            for( var d = 0; d < 2; ++d )
            {
                db[ c ][ d ] = Array(); 
            }
        }

        var query = util.format( 'USE %s; SHOW FULL TABLES', config.database );
        this.runSql( query, true )
            .on( 'result', function ( res )
            {
                res.on( 'row', function ( row )
                {
                    if ( row[ 0 ] && row[ 1 ] === 'VIEW' )
                        db[ 0 ][ 1 ].push( row[ 0 ] );
                    else if ( row[ 0 ] && row[ 0 ] !== 'migrations' )
                        db[ 0 ][ 0 ].push( row[ 0 ] );
                } );
            } )
            .on( 'end', function ()
            {
                if ( config.diffDump )
                    first = false;
                else
                    callback( db );
            } );

        if ( config.diffDump )
        {
            query = util.format( 'USE %s; SHOW FULL TABLES', config.database_diff );
            this.runSql( query, true )
                .on( 'result', function ( res )
                {
                    res.on( 'row', function ( row )
                    {
                        if ( row[ 0 ] && row[ 1 ] === 'VIEW' )
                            db[ 1 ][ 1 ].push( row[ 0 ] );
                        else if ( row[ 0 ] && row[ 0 ] !== 'migrations' )
                            db[ 1 ][ 0 ].push( row[ 0 ] );
                    } );
                } )
                .on( 'end', function ()
                {
                    while ( first )
                    {
                        deasync.sleep( 100 );
                    }

                    callback( db );
                } );
        }
    },

    /**
     * Returns an array containing the Columns.
     *
     * General return information:
     *
     * This array has 3 layers, the final information layer has
     * 8 elements.
     *
     * Array Format:
     * Layer 1:
     * [0] = real table, [1] = diff table
     *
     * Layer 2:
     * ['tablename'] = Array for final table indizies information
     *
     * Layer 3 (Result formatting):
     * [0] = Column name, [1] = Column Information Array*, [2] = Nullable,
     * [3] = default value, [4] = Primary Key,
     * [5] = extra*
     *
     * Column Information Array (Nested formatting)
     * [0] = datatye, [1] = length, [2] = signed/unsigned
     *
     * Extra (Possible Values)
     * null/undefined
     * ai
     * OUCT
     * custom value
     *
     * @return array
     */
    getColumns: function ( config, tables, context, callback )
    {
        var self = this,
            counter = 0,
            db = Array(),
            diff = Array(),
            first = true,
            extraValues = 
            {
                'auto_increment': 'ai',
                'on update CURRENT_TIMESTAMP': 'OUCT'
            };

        db[ 0 ] = Array();
        db[ 1 ] = Array();

        var len = ( tables.tables[ 0 ].length > tables.tables[ 1 ].length ) ?
            tables.tables[ 0 ].length : tables.tables[ 1 ].length;

        for ( var i = 0; i < len; ++i )
        {
            var query = '',
                stmt = 0;


            if ( tables.tables[ 0 ][ i ] )
                query = util.format( 'SHOW COLUMNS FROM %s.%s;', config.database, tables.tables[ 0 ][ i ] );
            else ++stmt;

            if ( tables.tables[ 1 ][ i ] )
                query += util.format( 'SHOW COLUMNS FROM %s.%s;', config.database_diff, tables.tables[ 1 ][ i ] );

            //scoping stmt and interator to event
            ( function ( stmt, i )
            {
                self.runSql( query, true )
                    .on( 'result', function ( res )
                    {
                        var local = stmt++;
                        res.on( 'row', function ( row )
                        {
                            var _match = row[ 1 ].match( /^(.*)\(([0-9\,]+)\) ?(.*)?/ );

                            if( !_match )
                            {
                                _match = Array();
                                _match[ 1 ] = row[ 1 ];
                                _match[ 2 ] = 0;
                                _match[ 3 ] = null;
                            }

                            //Transform to match the api
                            row[ 1 ] = [ _match[ 1 ], _match[ 2 ], ( _match[ 3 ] ) ? _match[ 3 ] : 0 ];
                            row[ 2 ] = ( row[ 2 ] === 'YES' ) ? true : false;
                            row[ 6 ] = row[ 5 ];

                            if( extraValues[ row[ 6 ] ] )
                                row[ 6 ] = extraValues[ row[ 6 ] ];

                            row[ 5 ] = ( row[ 3 ] === 'PRI' ) ? true : false;
                            row[ 3 ] = row[ 4 ];
                            row.splice( 4, 1 );

                            if ( !db[ local ][ tables.tables[ local ][ i ] ] )
                                db[ local ][ tables.tables[ local ][ i ] ] = Array();

                            db[ local ][ tables.tables[ local ][ i ] ].push( row );
                        } );
                    } )
                    .on( 'end', function ()
                    {
                        if ( ++counter >= len )
                            callback( context, db );
                    } );
            } )( stmt, i );
        }
    },



    /**
      * No specification yet.
      *
      * @return useless
      */
    getFn: function ( config, callback )
    {
        var self = this;
        var db = Array(),
            diff = Array(),
            first = true;

        db[ 0 ] = Array();
        db[ 1 ] = Array();
        diff[ 0 ] = Array();
        diff[ 1 ] = Array();

        var query = 'SELECT name, modified, type FROM mysql.proc WHERE db = ?';
        this.runSql( query, [ config.database ], false )
            .on( 'result', function ( res )
            {
                res.on( 'row', function ( row )
                {
                    if ( row.type === 'FUNCTION' )
                        db[ 0 ].push( [ row.name, row.modified ] );
                    else if ( row.type === 'PROCEDURE' )
                        db[ 1 ].push( [ row.name, row.modified ] );
                } );
            } )
            .on( 'end', function ()
            {
                if ( config.diffDump )
                    first = false;
                else
                    callback( db );
            } );

        if ( config.diffDump )
        {
            var query = 'SELECT name, modified, type FROM mysql.proc WHERE db = ?';
            this.runSql( query, [ config.database_diff ], false )
                .on( 'result', function ( res )
                {
                    res.on( 'row', function ( row )
                    {
                        if ( row.type === 'FUNCTION' )
                            diff[ 0 ].push( [ row.name, row.modified ] );
                        else if ( row.type === 'PROCEDURE' )
                            diff[ 1 ].push( [ row.name, row.modified ] );
                    } );
                } )
                .on( 'end', function ()
                {
                    while ( first )
                    {
                        deasync.sleep( 100 );
                    }

                    callback( db, diff );
                } );
        }
    },

    /**
     * Returns an array containing the engine information.
     * This might be only MariaDB/MySQL specific!
     *
     * General return information:
     *
     * This array has 2 layer, the final information layer has
     * 2 elements.
     *
     * Array Format:
     * Layer 1:
     * [0] = real table, [1] = diff table
     *
     * Layer 2 (Result formatting):
     * [0] = table name, [1] = engine
     *
     * @return array
     */
    getEngine: function ( config, context, callback )
    {
        var self = this,
            first = true;
        var query = 'SELECT TABLE_NAME, engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?';
        var db = Array();
        db[ 0 ] = Array();
        db[ 1 ] = Array();

        this.runSql( query, [ config.database ], true )
            .on( 'result', function ( res )
            {
                res.on( 'row', function ( row )
                {
                    if ( row[ 0 ] !== 'migrations' && row[ 2 ] !== null )
                        db[ 0 ].push( row );
                } );
            } )
            .on( 'end', function ()
            {
                if ( config.diffDump )
                    first = false;
                else
                    callback( context, db );
            } );

        if ( config.diffDump )
        {
            this.runSql( query, [ config.database_diff ], true )
                .on( 'result', function ( res )
                {
                    res.on( 'row', function ( row )
                    {
                        if ( row[ 0 ] !== 'migrations' && row[ 2 ] !== null )
                            db[ 1 ].push( row );
                    } );
                } )
                .on( 'end', function ()
                {
                    while ( first )
                    {
                        deasync.sleep( 100 );
                    }

                    callback( context, db );
                } );
        }
    },

    /**
     * Returns an array containing the indizies.
     *
     * General return information:
     *
     * This array has 3 layers, the final information layer has
     * 6 elements.
     *
     * Array Format:
     * Layer 1:
     * [0] = real table, [1] = diff table
     *
     * Layer 2:
     * ['tablename'] = Array for final table indizies information
     *
     * Layer 3 (Result formatting):
     * [0] = key name, [1] = unique( true or false ),
     * [2] = Position of column in index (Sequence in index),
     * [3] = column name, [4] = Nullable, [5] = index type
     *
     * @return array
     */
    getIndizies: function ( config, tables, context, callback )
    {
        var self = this;
        var db = Array(),
            counter = 0,
            query = 'SHOW INDEX FROM %s.%s;';
        db[ 0 ] = Array();
        db[ 1 ] = Array();
        var len = ( tables.tables[ 0 ].length > tables.tables[ 1 ].length ) ?
            tables.tables[ 0 ].length : tables.tables[ 1 ].length;

        for ( var i = 0; i < len; ++i )
        {
            var q = '',
                stmt = 0;


            if ( tables.tables[ 0 ][ i ] )
                q = util.format( query, config.database, tables.tables[ 0 ][ i ] );
            else ++stmt;

            if ( tables.tables[ 1 ][ i ] )
                q += util.format( query, config.database_diff, tables.tables[ 1 ][ i ] );

            //scoping stmt and interator to event
            ( function ( stmt, i )
            {
                self.runSql( q, true )
                    .on( 'result', function ( res )
                    {
                        var local = stmt++;
                        res.on( 'row', function ( row )
                        {
                            row[ 0 ] = row[ 2 ]; //replace table by key name
                            row[ 1 ] = row[ 1 ] === '0';

                            row.splice( 2, 1 ); //delete moved key name

                            //<-- Seq_in_index has now moved one index lower
                            row.splice( 4, 4 ); //delete until null info
                            row[ 4 ] = ( row[ 4 ] === 'YES' ) ? true : false;
                            //Comment and Index_comment will be simply ignored
                            //Maybe I'm going to implement them later, but not for now.

                            if ( !db[ local ][ tables.tables[ local ][ i ] ] )
                                db[ local ][ tables.tables[ local ][ i ] ] = Array();

                            db[ local ][ tables.tables[ local ][ i ] ].push( row );
                        } );
                    } )
                    .on( 'end', function ()
                    {
                        if ( ++counter >= len )
                            callback( context, db );
                    } );
            } )( stmt, i );
        }
    },

    /**
     * Returns an array containing the foreign keys.
     *
     * General return information:
     *
     * This array has 3 layers, the final information layer has
     * 8 elements.
     *
     * Array Format:
     * Layer 1:
     * [0] = real table, [1] = diff table
     *
     * Layer 2:
     * ['tablename'] = Array for final table indizies information
     *
     * Layer 3 (Result formatting):
     * [0] = foreign_key_name, [1] = column_name, [2] = referenced_table_schema,
     * [3] = referenced_table_name, [4] = referenced_column_name,
     * [5] = position_in_unique_constraint, [6] = on_update,
     * [7] = on_delete
     *
     * @return array
     */
    getFK: function ( config, tables, context, callback )
    {
        var self    = this,
            db      = Array(),
            counter = 0;

        db[ 0 ] = Array();
        db[ 1 ] = Array();
        var len = ( tables.tables[ 0 ].length > tables.tables[ 1 ].length ) ?
            tables.tables[ 0 ].length : tables.tables[ 1 ].length;

        var query = [
                'SELECT const.CONSTRAINT_NAME, const.CONSTRAINT_SCHEMA,const.TABLE_NAME,',
                'const.REFERENCED_TABLE_NAME,const.UPDATE_RULE,const.DELETE_RULE,',
                'const_keys.COLUMN_NAME,const_keys.POSITION_IN_UNIQUE_CONSTRAINT,',
                'const_keys.REFERENCED_COLUMN_NAME,const_keys.REFERENCED_TABLE_SCHEMA',
                'FROM information_schema.REFERENTIAL_CONSTRAINTS const',
                'INNER JOIN information_schema.KEY_COLUMN_USAGE const_keys ON ( ',
                'const_keys.CONSTRAINT_SCHEMA = const.CONSTRAINT_SCHEMA',
                'AND const_keys.CONSTRAINT_NAME = const.CONSTRAINT_NAME )',
                'WHERE const.CONSTRAINT_SCHEMA = ?',
                'AND const.TABLE_NAME = ?;'
            ]
            .join( ' ' );

        for ( var i = 0; i < len; ++i )
        {
            var q = '',
                params = Array(),
                stmt = 0;


            if ( tables.tables[ 0 ][ i ] )
            {
                q = query;
                params.push( config.database );
                params.push( tables.tables[ 0 ][ i ] );
            }
            else ++stmt;

            if ( tables.tables[ 1 ][ i ] )
            {
                q += query;
                params.push( config.database_diff );
                params.push( tables.tables[ 1 ][ i ] );
            }

            //scoping stmt and interator to event
            ( function ( stmt, i )
            {
                self.runSql( q, params, true )
                    .on( 'result', function ( res )
                    {
                        var local = stmt++;
                        res.on( 'row', function ( row )
                        {
                            constraint = Array();

                            if ( !db[ local ][ tables.tables[ local ][ i ] ] )
                                db[ local ][ tables.tables[ local ][ i ] ] = Array();

                            constraint[ 0 ] = row[ 0 ]; //constraint_name
                            constraint[ 1 ] = row[ 6 ]; //column_name
                            constraint[ 2 ] = row[ 9 ]; //referenced_table_schema
                            constraint[ 3 ] = row[ 3 ]; //referenced_table_name
                            constraint[ 4 ] = row[ 8 ]; //referenced_column_name
                            constraint[ 5 ] = row[ 7 ]; //position_in_unique_constraint
                            constraint[ 6 ] = row[ 4 ]; //on_update
                            constraint[ 7 ] = row[ 5 ]; //on_delete              

                            db[ local ][ tables.tables[ local ][ i ] ].push( constraint );
                        } );
                    } )
                    .on( 'end', function ()
                    {
                        if ( ++counter >= len )
                            callback( context, db );
                    } );
            } )( stmt, i );
        }
    },

    runSql: function ()
    {
        var args = this._makeParamArgs( arguments );

        log.sql.apply( null, arguments );

        return this.connection.query.apply( this.connection, args );
    },

    _makeParamArgs: function ( args )
    {
        var params = Array.prototype.slice.call( args );
        var sql = params.shift();
        var callback = params.pop();

        if ( params.length > 0 && Array.isArray( params[ 0 ] ) )
        {
            params = params[ 0 ];
        }

        return [ sql, params, callback ];
    },

    close: function ()
    {
        this.connection.end();
    }

};


exports.connect = function ( config, callback )
{
    var db;

    if ( !config.db )
    {
        db = new Mariasql();
        db.connect( config );
    }
    else
    {
        db = config.db;
    }

    db.on( 'connect', function ()
    {
        callback( null, new MariasqlDriver( db ) );
        log.verbose( 'Client connected.' );
    } )
        .on( 'error', function ( err )
        {
            console.log( 'Client error: ' + err );
        } )
        .on( 'close', function ( hadError )
        {
            log.verbose( 'Client closed' );
        } );
};