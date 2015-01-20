var log = require( 'db-migrate/lib/log' );
var util = require( 'util' );
var deasync = require( 'deasync' );
var BaseTemplate = require( './base' );

util.inherits( DBMigrateMigrationBuilder, BaseTemplate );

function DBMigrateMigrationBuilder( primary )
{
    this.primary = primary;
    this.extra_values = 
    {
        'ai': ', autoIncrement: true',
        'OUCT': '' //yet not supported by db_migrate
    };

    this.migrationTemplate = [
        [ 
            'var path = \'\';\nif( umigrate ) \n{',
            'path = \'umigrate/node_modules/\';',
            '}\n\nvar dbm = require(path + \'db-migrate\');\nvar type = dbm.dataType;\nvar async = require(path + \'async\');',
            '\n\nexports.up = function(db, callback) {\n'
        ].join( '\n' ),
        '\n};\n\nexports.down = function(db, callback) {\n',
        '\n};\n'
    ];
}

DBMigrateMigrationBuilder.prototype = {

    table: function ( table, columns, drop )
    {
        var createTable = util.format( 'db.createTable(\'%s\', {', table );
        var dropTable = util.format( 'db.dropTable(\'%s\', { ifExists: true }, callback);', table );

        createTable += this.Columns( '\n%s: { type: \'%s\'', columns, ' },' );

        createTable = createTable.substring( 0, createTable.length - 1 ) + '\n}, callback);';

        return this.createMigration( createTable, dropTable, drop );
    },

    //ToDo: callback for all columns
    columns: function ( table, columns, drop )
    {
        var addColumn = 'async.series([',
            dropColumn = 'async.series([';
        var aC = util.format( '\ndb.addColumn.bind( db, \'%s\', \'%%s\', { type: \'%%s\'', table );
        var dC = util.format( '\ndb.removeColumn.bind( db, \'%s\', \'%%s\')', table );

        for ( var i = 0; i < columns.length; ++i )
        {
            if ( i > 0 )
                dropColumn += ',';

            dropColumn += util.format( dC, columns[ i ][ 0 ] );
        }

        dropColumn += '], callback);';

        addColumn += this.Columns( aC, columns, ' } ),' );
        addColumn = addColumn.substring( 0, addColumn.length - 1 ) + '], callback);'; 

        return this.createMigration( addColumn, dropColumn, drop );
    },

    changeKeys: function ( table, keys, drop, index )
    {
        var addKey = 'async.series([',
            dropKey = 'async.series([',
            firstLine = true,
            index = ( drop !== undefined && index !== undefined ) ? index : 0,
            kI = 0, _kI = 0;

        var aK = util.format( '\ndb.removeIndex.bind(db, \'%s\', \'%%s\'),\ndb.addIndex.bind(db, \'%s\', \'%%s\', [ ', table, table );
        var dK = util.format( '\ndb.removeIndex.bind(db, \'%s\', \'%%s\'),\ndb.addIndex.bind(db, \'%s\', \'%%s\', [ ', table, table );
        var es = '\'%s\'';

        oKeys = Object.keys( keys );
        for( kI = 0; kI < oKeys.length; ++kI )
        {
            var addUnique = false,
                dropUnique = false,
                firstKey = true;


            if ( this.primary && oKeys[ kI ] === 'PRIMARY' )
                continue;

            if ( !firstLine )
            {
                dropKey += ',';
                addKey  += ',';
            }
            else
            {
                firstLine = false;
            }

            addKey += util.format( aK, oKeys[ kI ], oKeys[ kI ] );
            dropKey += util.format( dK, oKeys[ kI ], oKeys[ kI ] );

            _oKeys = Object.keys( keys[ oKeys[ kI ] ] );
            for( _kI = 0; _kI < _oKeys.length; ++_kI )
            {
                if ( firstKey )
                {
                    firstKey = false;
                    addKey  += util.format( es, _oKeys[ _kI ] );
                    dropKey += util.format( es, _oKeys[ _kI ] );
                }
                else
                {
                    addKey  += ', ' + util.format( es, _oKeys[ _kI ] );
                    dropKey += ', ' + util.format( es, _oKeys[ _kI ] );
                }

                if ( !addUnique )
                    addUnique = keys[ oKeys[ kI ] ][ _oKeys[ _kI ] ][ 0 ][ index ];

                if ( !dropUnique )
                    dropUnique = keys[ oKeys[ kI ] ][ _oKeys[ _kI ] ][ 1 ][ index ];
            }

            if ( addUnique )
                addKey += ' ], true )';
            else
                addKey += ' ] )';

            if ( dropUnique )
                dropKey += ' ], true )';
            else
                dropKey += ' ] )';
        }

        addKey  += '\n], callback);';
        dropKey += '\n], callback);';

        //removeIndex([tableName], indexName, callback);
        //addIndex(tableName, indexName, columns, [unique], callback);

        return this.createMigration( addKey, dropKey, drop );
    },

    keys: function ( table, keys, drop, index )
    {
        var addKey = 'async.series([',
            dropKey = 'async.series([',
            firstLine = true,
            index = ( drop !== undefined && index !== undefined ) ? index : 2;

        var aK = util.format( '\ndb.addIndex.bind(db, \'%s\', \'%%s\', [ ', table );
        var dK = util.format( '\ndb.removeIndex.bind(db, \'%s\', \'%%s\')', table );
        var es = '\'%s\'';

        if( !keys )
            return;

        var oKeys = Object.keys( keys );
        for( kI = 0; kI < oKeys.length; ++kI )
        {
            if ( this.primary && oKeys[ kI ] === 'PRIMARY' )
                continue;

            if ( !firstLine )
            {
                dropKey += ',';
                addKey += ',';
            }
            else
            {
                firstLine = false;
            }

            addKey += util.format( aK, oKeys[ kI ] );
            dropKey += util.format( dK, oKeys[ kI ] );


            addKey += util.format( es, keys[ oKeys[ kI ] ][ 0 ][ index ] );
            for ( var i = 1; i < keys[ oKeys[ kI ] ].length; ++i )
            {
                addKey += ', ' + util.format( es, keys[ oKeys[ kI ] ][ i ][ index ] );
            }

            if ( keys[ oKeys[ kI ] ][ 0 ][ 1 ] )
                addKey += ' ], true )';
            else
                addKey += ' ] )';

        }

        addKey  += '\n], callback);';
        dropKey += '\n], callback);';


        //removeIndex([tableName], indexName, callback);
        //addIndex(tableName, indexName, columns, [unique], callback);

        return this.createMigration( addKey, dropKey, drop );
    },

    engine: function ( table, engines, drop )
    {
        var sql = util.format( 'ALTER TABLE `%s` ENGINE = ?', table );
        
        engines[ 1 ] = engines[ 1 ] || engines[ 0 ];
        engines[ 0 ] = engines[ 0 ] || engines[ 1 ];

        var createEngine = 'db.runSql(\'' + sql + '\', \'' + engines[ 1 ] + '\', callback);';
        var dropEngine = '';

        if ( engines[ 0 ] !== engines[ 1 ] )
            dropEngine = 'db.runSql(\'' + sql + '\', \'' + engines[ 0 ] + '\', callback);';
        else
            dropEngine = 'callback(); //irreversable migration';

        return this.createMigration( createEngine, dropEngine, drop );
    },

    Columns: function ( begin, columns, end, br )
    {
        var create = '';

        for ( var i = 0; i < columns.length; ++i )
        {
            if ( br && i > 0 )
                create += '\n';

            create += util.format( begin, columns[ i ][ 0 ], columns[ i ][ 1 ][ 0 ] );
            if ( columns[ i ][ 1 ][ 2 ] )
                create += ', unsigned: true';

            if ( !columns[ i ][ 2 ] )
                create += ', notNull: true';

            if ( columns[ i ][ 3 ] )
                create += util.format( ', defaultValue: \'%s\'', columns[ i ][ 3 ] );

            //Some DBS may have no primary keys. But I like to have the primary oKeys[ kI ] information in the creation information,
            //instead of storing them separated like the other keys.
            if ( this.primary && columns[ i ][ 4 ] )
                create += ', primaryKey: true';

            if ( columns[ i ][ 5 ] )
                create += this.extra_values[ columns[ i ][ 5 ] ];


            if( typeof( columns[ i ][ 1 ][ 1 ] ) === 'string' && columns[ i ][ 1 ][ 1 ].indexOf( ',' ) !== -1 )
                columns[ i ][ 1 ][ 1 ] = columns[ i ][ 1 ][ 1 ].replace( ',', '.' );

            create += util.format( ', length: %d', columns[ i ][ 1 ][ 1 ] );

            create += end;
        }

        return create;
    },

    createMigration: function ( up, down, drop )
    {
        if ( drop )
            return this.migrationTemplate[ 0 ] + down + this.migrationTemplate[ 1 ] + up + this.migrationTemplate[ 2 ];
        else
            return this.migrationTemplate[ 0 ] + up + this.migrationTemplate[ 1 ] + down + this.migrationTemplate[ 2 ];
    }

};



exports.connect = function ( config, callback )
{
    callback( null, new DBMigrateMigrationBuilder( config.primary ) );
};