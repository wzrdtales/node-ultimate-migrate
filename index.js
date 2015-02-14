#!/usr/bin/env node

/**
  * This code is mostly the same as db-migrate/bin/db-migrate and therefore
  * most of the time the LICENSE of db-migrate applies to this single file.
  *
  * https://github.com/kunklejr/node-db-migrate/blob/master/LICENSE
  */
var index = require( 'db-migrate' );
var assert = require( 'assert' );
var fs = require( 'fs' );
var path = require( 'path' );
var util = require( 'util' );
var mkdirp = require( 'mkdirp' );
var optimist = require( 'optimist' );
var config = require( 'db-migrate/lib/config.js' );
var log = require( 'db-migrate/lib/log' );
var pkginfo = require( 'pkginfo' )( module, 'version' );
var dotenv = require( 'dotenv' );
var Builder = require( './lib/builder.js' );
var driver = require( './lib/driver/' );
var template = require( './lib/template/' );

//global declaration for detection
dbm = require( 'db-migrate' );
async = require( 'async' );

dotenv.load();

process.on( 'uncaughtException', function ( err )
{
    log.error( err.stac );
    process.exit( 1 );
} );

var argv = optimist
    .
default (
{
    verbose: false,
    'cross-compatible': false,
    'force-exit': false,
    'sql-file': false,
    config: process.cwd() + '/database.json',
    'migrations-dir': process.cwd() + '/migrations'
} )
    .usage( 'Usage: umigrate [up|down|reset|create|db|dump] [[dbname/]migrationName|all] [options]' )

.describe( 'env', 'The environment to run the migrations under (dev, test, prod).' )
    .alias( 'e', 'env' )
    .string( 'e' )

.describe( 'migrations-dir', 'The directory containing your migration files.' )
    .alias( 'm', 'migrations-dir' )
    .string( 'm' )

.describe( 'count', 'Max number of migrations to run.' )
    .alias( 'c', 'count' )
    .string( 'c' )

.describe( 'dry-run', 'Prints the SQL but doesn\'t run it.' )
    .boolean( 'dry-run' )

.describe( 'force-exit', 'Forcibly exit the migration process on completion.' )
    .boolean( 'force-exit' )

.describe( 'verbose', 'Verbose mode.' )
    .alias( 'v', 'verbose' )
    .boolean( 'v' )

.alias( 'h', 'help' )
    .alias( 'h', '?' )
    .boolean( 'h' )

.describe( 'version', 'Print version info.' )
    .alias( 'i', 'version' )
    .boolean( 'version' )

.describe( 'diffdb', 'Specify manually a DataBase to diff.' )
    .alias( 'd', 'diffdb' )
    .string( 'd' )

.describe( 'cross-compatible', 'Dumper will run in compatible mode. By default everything generic keeps x-compatible' )
    .alias( 'x', 'cross-compatible' )
    .boolean( 'x' )

.describe( 'template', 'Specify which tempĺate to use.' )
    .alias( 't', 'template' )
    .string( 't' )

.describe( 'config', 'Location of the database.json file.' )
    .string( 'config' )

.describe( 'db_persist', 'Defines wether the diff database should be persistent or be rollbacked after diff.' )
    .alias( 'p', 'db_persist' )
    .boolean( 'db_persist' )

.describe( 'sql-file', 'Automatically create two sql files for up and down statements in /sqls and generate the javascript code that loads them.' )
    .boolean( 'sql-file' )

.describe( 'coffee-file', 'Create a coffeescript migration file' )
    .boolean( 'coffee-file' )

.describe( 'migration-table', 'Set the name of the migration table, which stores the migration history.' )
    .alias( 'table', 'migration-table' )
    .alias( 't', 'table' )
    .string( 't' )


.argv;

if ( argv.version )
{
    console.log( module.exports.version );
    process.exit( 0 );
}

if ( argv.help || argv._.length === 0 )
{
    optimist.showHelp();
    process.exit( 1 );
}

global.migrationTable = argv.table;
global.dbm = dbm;
global.matching = '';
global.mode;
global.verbose = argv.verbose;
global.dryRun = argv[ 'dry-run' ];
if ( global.dryRun )
{
    log.info( 'dry run' );
}

function connect( config, callback )
{
    if ( argv.template !== true )
        config.template = argv.template || config.template;

    template.connect( config, function ( err, tmp )
    {
        if( err )
        {
            callback( err );
            return;
        }

        driver.connect( config, function ( err, db )
        {
            if ( err )
            {
                callback( err );
                return;
            }
            callback( null, new Builder( db, tmp, argv[ 'migrations-dir' ] ) );
        } );
    } );
}

function createMigrationDir( dir, callback )
{
    fs.stat( dir, function ( err, stat )
    {
        if ( err )
        {
            mkdirp( dir, callback );
        }
        else
        {
            callback();
        }
    } );
}

function loadConfig()
{
    if ( process.env.DATABASE_URL )
    {
        config.loadUrl( process.env.DATABASE_URL, argv.env );
    }
    else
    {
        config.load( argv.config, argv.env );
    }

    if ( verbose )
    {
        var current = config.getCurrent();
        var s = JSON.parse( JSON.stringify( current.settings ) );

        if ( s.password )
            s.password = '******';

        log.info( 'Using', current.env, 'settings:', s );
    }
}

function executeCreate()
{
    var folder, path;

    if ( argv._.length === 0 )
    {
        log.error( '\'migrationName\' is required.' );
        optimist.showHelp();
        process.exit( 1 );
    }

    createMigrationDir( argv[ 'migrations-dir' ], function ( err )
    {
        if ( err )
        {
            log.error( 'Failed to create migration directory at ', argv[ 'migrations-dir' ], err );
            process.exit( 1 );
        }

        argv.title = argv._.shift();
        folder = argv.title.split( '/' );

        argv.title = folder[ folder.length - 2 ] || folder[ 0 ];
        path = argv[ 'migrations-dir' ];

        if( folder.length > 1 )
        {
            path += '/';

            for( var i = 0; i < folder.length - 1; ++i )
            {
                path += folder[ i ] + '/';
            }
        }
        var templateType = Migration.TemplateType.DEFAULT_JS;

        if( shouldCreateSqlFiles() )
        {
            templateType = Migration.TemplateType.SQL_FILE_LOADER;
        }
        else if( shouldCreateCoffeeFile() )
        {
            templateType = Migration.TemplateType.DEFAULT_COFFEE;
        }

        var migration = new Migration( argv.title + '.js', path, new Date(), templateType );

        index.createMigration( migration, function ( err, migration )
        {
            assert.ifError( err );
            log.info( util.format( 'Created migration at %s', migration.path ) );
        } );
    } );

    if ( shouldCreateSqlFiles() )
        createSqlFiles();
}

function shouldCreateCoffeeFile()
{
    return argv[ 'coffee-file' ] || config[ 'coffee-file' ];
}

function shouldCreateSqlFiles()
{
    return argv[ 'sql-file' ] || config[ 'sql-file' ];
}

function createSqlFiles()
{
    var sqlDir = argv[ 'migrations-dir' ] + '/sqls';

    createMigrationDir( sqlDir, function( err )
    {
        if ( err )
        {
            log.error( 'Failed to create migration directory at ', sqlDir, err );
            process.exit( 1 );
        }

        var templateTypeDefaultSQL = Migration.TemplateType.DEFAULT_SQL;
        var migrationUpSQL = new Migration( argv.title + '-up.sql', sqlDir, new Date(), templateTypeDefaultSQL );

        index.createMigration( migrationUpSQL, function( err, migration )
        {
            assert.ifError( err );
            log.info( util.format( 'Created migration up sql file at %s', migration.path ) );
        } );

        var migrationDownSQL = new Migration( argv.title + '-down.sql', sqlDir, new Date(), templateTypeDefaultSQL );

        index.createMigration( migrationDownSQL, function( err, migration )
        {
            assert.ifError( err );
            log.info( util.format( 'Created migration down sql file at %s', migration.path ) );
        } );
    } );
}

function executeDump()
{
    if ( argv[ 'cross-compatible' ] || config.getCurrent().settings.compatible )
    {
        console.log( 'Cross Compatible is currently not yet implemented! Switching back to Specific mode.' );
        console.log( 'Note that in compatible mode partitions, fulltext indexes and other DataBase Specific Features you made will be lost. This may be possible in any future release.' );
    }
    else
    {
        console.log( 'Running in DataBase Specific mode.' );
    }

    createMigrationDir( argv[ 'migrations-dir' ], function ( err )
    {
        if ( err )
        {
            log.error( 'Failed to create migration directory at ', argv[ 'migrations-dir' ], err );
            process.exit( 1 );
        }

        var migration = config.getCurrent().settings.database;
        config.getCurrent().settings.diffDump = true;
        config.getCurrent().settings.database = migration + '_diff';
        config.getCurrent().settings.database_diff = migration + '_diff';

        executeUp( function ( err, complete, callback )
        {
            if ( err )
                process.exit( 1 );

            callback( function ( err )
            {
                if ( err )
                    process.exit( 1 );

                complete();


                config.getCurrent().settings.database = migration;

                connect( config.getCurrent().settings, buildMigration );
            } );
        } );
    } );
}

function buildMigration( err, builder )
{
    if ( err === undefined )
        process.exit( 1 );

    builder.build( config.getCurrent().settings, function ( cb )
    {
        if ( config.getCurrent().settings.db_persist )
            cb();
        else
        {
            var originalDatabase = config.getCurrent().settings.database;
            config.getCurrent().settings.database += '_diff';

            executeDown( function ( err, complete, callback )
            {
                if ( err )
                    process.exit( 1 );

                callback( function ( err )
                {
                    if ( err )
                        process.exit( 1 );

                    complete();


                    config.getCurrent().settings.database = originalDatabase;

                    cb();
                } );
            } );
        }

    }, function ( err )
    {
        if ( err )
            log.info( 'An error occured: ' + err );

        builder.close();
    } );
}

function executeUp( callback )
{
    if ( !argv.count )
    {
        argv.count = Number.MAX_VALUE;
    }
    index.connect( config.getCurrent().settings, function ( err, migrator )
    {
        assert.ifError( err );

        if( global.locTitle )
            migrator.migrationsDir = path.resolve( argv['migrations-dir'], global.locTitle );
        else
            migrator.migrationsDir = path.resolve( argv['migrations-dir'] );

        migrator.driver.createMigrationsTable( function ( err )
        {
            assert.ifError( err );
            log.verbose( 'migration table created' );
            if ( typeof ( callback ) === 'function' )
                callback( null, onComplete.bind( this, migrator ), function ( callback )
                {
                    migrator.up( argv, callback );
                } );
            else
                migrator.up( argv, onComplete.bind( this, migrator ) );
        } );
    } );
}

function executeDown( callback )
{
    if ( !argv.count )
    {
        log.info( 'Defaulting to running 1 down migration.' );
        argv.count = 1;
    }
    index.connect( config.getCurrent().settings, function ( err, migrator )
    {
        assert.ifError( err );
        migrator.migrationsDir = path.resolve( argv[ 'migrations-dir' ] );
        migrator.driver.createMigrationsTable( function ( err )
        {
            assert.ifError( err );
            if ( typeof ( callback ) === 'function' )
                callback( null, onComplete.bind( this, migrator ), function ( callback )
                {
                    migrator.down( argv, callback );
                } );
            else
                migrator.down( argv, onComplete.bind( this, migrator ) );
        } );
    } );
}

function executeDB() {

    if( argv._.length > 0 )
    {
        argv.dbname = argv._.shift().toString();
    }
    else
    {
        log.info( 'Error: You must enter a database name!' );
        return;
    }

    index.driver( config.getCurrent().settings, function( err, db )
    {
        if( global.mode === 'create' )
        {
            db.createDatabase( argv.dbname, { ifNotExists: true }, function()
            {
                if( err )
                {
                    log.info( 'Error: Failed to create database!' );
                }
                else
                {
                    log.info( 'Created database "' + argv.dbname + '"' );
                }

                db.close();
            } );
        }
        else if( global.mode === 'drop' )
        {
            db.dropDatabase( argv.dbname, { ifExists: true }, function()
            {
                if( err )
                {
                    log.info( 'Error: Failed to drop database!' );
                }
                else
                {
                    log.info( 'Deleted database "' + argv.dbname + '"' );
                }

                db.close();
            } );
        }
        else
            return;
    } );

}

function onComplete( migrator, originalErr )
{
    migrator.driver.close( function ( err )
    {
        assert.ifError( originalErr );
        assert.ifError( err );
        log.info( 'Done' );
    } );
}

function run()
{
    var action = argv._.shift(),
        folder = action.split( ':' );

    switch ( action )
    {
    case 'dump':
        loadConfig();
        executeDump();
        break;
    case 'create':
        executeCreate();
        break;
    case 'up':
    case 'down':
    case 'reset':
        loadConfig();

        if( action === 'reset' )
            argv.count = Number.MAX_VALUE;

        if ( argv._.length > 0 )
        {
            if ( action == 'down' )
            {
                log.info( 'Ignoring migration name for down migrations.  Use --count to control how many down migrations are run.' );
                argv.destination = null;
            }
            else
            {
                argv.destination = argv._.shift().toString();
            }
        }

        if( folder[ 1 ] )
        {
            global.matching = folder[ 1 ];
            global.migrationMode = folder[ 1 ];
        }

        if ( action == 'up' )
        {
            executeUp();
        }
        else
        {
            executeDown();
        }
        break;

    case 'db':
        loadConfig();

        if( folder.length < 1 )
        {
            log.info( 'Please enter a valid command, i.e. db:create|db:drop' );
        }
        else
        {
            global.mode = folder[ 1 ];
            executeDB();
        }
        break;

    default:
        log.error( 'Invalid Action: Must be [up|down|create].' );
        optimist.showHelp();
        process.exit( 1 );
        break;
    }
}

run();

if ( argv[ 'force-exit' ] )
{
    log.verbose( 'Forcing exit' );
    process.exit( 0 );
}