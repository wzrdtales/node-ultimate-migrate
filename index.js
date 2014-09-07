#!/usr/bin/env node

//This code is mostly the same as db-migrate/bin/db-migrate
var index = require('db-migrate');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var util = require('util');
var mkdirp = require('mkdirp');
var optimist = require('optimist');
var config = require('db-migrate/lib/config.js');
var log = require('db-migrate/lib/log');
var pkginfo = require('pkginfo')(module, 'version');
var dotenv = require('dotenv');
var Builder = require('./lib/builder.js');
var driver = require('./lib/driver/');

dotenv.load();

process.on('uncaughtException', function(err) {
  log.error(err.stack);
  process.exit(1);
});

var argv = optimist
    .default({
      verbose: false,
      'cross-compatible': false,
      'force-exit': false,
      config: process.cwd() + '/database.json',
      'migrations-dir': process.cwd() + '/migrations' })
    .usage('Usage: db-umigrate [up|down|create|dump] migrationName [options]')

    .describe('env', 'The environment to run the migrations under (dev, test, prod).')
    .alias('e', 'env')
    .string('e')

    .describe('migrations-dir', 'The directory containing your migration files.')
    .alias('m', 'migrations-dir')
    .string('m')

    .describe('count', 'Max number of migrations to run.')
    .alias('c', 'count')
    .string('c')

    .describe('dry-run', 'Prints the SQL but doesn\'t run it.')
    .boolean('dry-run')

    .describe('force-exit', 'Forcibly exit the migration process on completion.')
    .boolean('force-exit')

    .describe('verbose', 'Verbose mode.')
    .alias('v', 'verbose')
    .boolean('v')

    .alias('h', 'help')
    .alias('h', '?')
    .boolean('h')

    .describe('version', 'Print version info.')
    .alias('i', 'version')
    .boolean('version')

    .describe('diffdb', 'Specify manually a DataBase to diff.')
    .alias('d', 'diffdb')
    .string('d')

    .describe('cross-compatible', 'Dumper will run in compatible mode. By default everything generic keeps x-compatible')
    .alias('x', 'cross-compatible')
    .boolean('x')

    .describe('config', 'Location of the database.json file.')
    .string('config')

    .argv;

if (argv.version) {
  console.log(module.exports.version);
  process.exit(0);
}

if (argv.help || argv._.length === 0) {
  optimist.showHelp();
  process.exit(1);
}

global.verbose = argv.verbose;
global.dryRun = argv['dry-run'];
if(global.dryRun) {
  log.info('dry run');
}

function connect( config, callback ) {
  driver.connect(config, function(err, db) {
    if (err) { callback(err); return; }
    callback(null, new Builder(db, config['migrations-dir']));
  });
};

function createMigrationDir(dir, callback) {
  fs.stat(dir, function(err, stat) {
    if (err) {
      mkdirp(dir, callback);
    } else {
      callback();
    }
  });
}

function loadConfig() {
  if (process.env.DATABASE_URL) {
    config.loadUrl(process.env.DATABASE_URL, argv.env);
  } else {
    config.load(argv.config, argv.env);
  }
  if(verbose) {
    var current = config.getCurrent();
    log.info('Using', current.env, 'settings:', current.settings);
  }
}

function executeCreate() {
  if(argv._.length === 0) {
    log.error('\'migrationName\' is required.');
    optimist.showHelp();
    process.exit(1);
  }

  createMigrationDir(argv['migrations-dir'], function(err) {
    if (err) {
      log.error('Failed to create migration directory at ', argv['migrations-dir'], err);
      process.exit(1);
    }

    argv.title = argv._.shift();
    index.createMigration(argv.title, argv['migrations-dir'], function(err, migration) {
      assert.ifError(err);
      log.info(util.format('Created migration at %s', migration.path));
    });
  });
}

function executeDump()
{
  if( argv['cross-compatible'] || config.getCurrent().settings.compatible )
  {
    console.log( 'Cross Compatible is currently not yet implemented! Switching back to Specific mode.' );
    console.log( 'Note that in compatible mode partitions, fulltext indexes and other DataBase Specific Features you made will be lost. This may be possible in any future release.' );
  }
  else
    console.log( 'Running in DataBase Specific mode.' );

  createMigrationDir(argv['migrations-dir'], function(err) {
    if (err) {
      log.error('Failed to create migration directory at ', argv['migrations-dir'], err);
      process.exit(1);
    }

    if( err === undefined )
    {
      var migration = config.getCurrent().settings.database;
      config.getCurrent().settings.diffDump = true;
      config.getCurrent().settings.database = migration + '_diff';
      config.getCurrent().settings.database_diff = migration + '_diff';
      
      executeUp( function( err, complete, callback )
      {
        if(err)
          process.exit(1);

        callback( function(err)
        {
          if(err)
            process.exit(1);

          complete();

          
          config.getCurrent().settings.database = migration;

          connect( config.getCurrent().settings, buildMigration );     
        });
      });
    }
    else
      connect( config.getCurrent().settings, buildMigration );
  });
}

function buildMigration( err, builder )
{
  if( err === undefined )
    process.exit(1);

  builder.build( config.getCurrent().settings, function(err)
  {
    builder.close();

    //config.getCurrent().settings.database = migration + '_diff';
    //executeDown();
  });
}

function executeUp( callback ) {
  if(!argv.count) {
    argv.count = Number.MAX_VALUE;
  }
  index.connect(config.getCurrent().settings, function(err, migrator) {
    assert.ifError(err);
    migrator.migrationsDir = path.resolve(argv['migrations-dir']);
    migrator.driver.createMigrationsTable(function(err) {
      assert.ifError(err);
      log.verbose('migration table created');
      if( typeof( callback ) === 'function' )
        callback( null, onComplete.bind( this, migrator ), function( callback )
        {
          migrator.up( argv, callback );
        });
      else
        migrator.up( argv, onComplete.bind( this, migrator ) );
    });
  });
}

function executeDown( callback ) {
  if(!argv.count) {
    log.info('Defaulting to running 1 down migration.');
    argv.count = 1;
  }
  index.connect(config.getCurrent().settings, function(err, migrator) {
    assert.ifError(err);
    migrator.migrationsDir = path.resolve(argv['migrations-dir']);
    migrator.driver.createMigrationsTable(function(err) {
      assert.ifError(err);
      if( typeof( callback ) === 'function' )
        callback( null, onComplete.bind( this, migrator ), function( callback )
        {
          migrator.down( argv, callback );
        });
      else
        migrator.down( argv, onComplete.bind( this, migrator ) );
    });
  });
}

function onComplete(migrator, originalErr) {
  migrator.driver.close(function(err) {
    assert.ifError(originalErr);
    assert.ifError(err);
    log.info('Done');
  });
}

function run() {
  var action = argv._.shift();
  switch(action) {
    case 'dump':
      loadConfig();
      executeDump();
      break;
    case 'create':
      executeCreate();
      break;
    case 'up':
    case 'down':
      loadConfig();
      if(argv._.length > 0) {
        if (action == 'down') {
          log.info('Ignoring migration name for down migrations.  Use --count to control how many down migrations are run.');
          argv.destination = null;
        } else {
          argv.destination = argv._.shift().toString();
        }
      }
      if(action == 'up') {
        executeUp();
      } else {
        executeDown();
      }
      break;

    default:
      log.error('Invalid Action: Must be [up|down|create].');
      optimist.showHelp();
      process.exit(1);
      break;
  }
}

run();

if (argv['force-exit']) {
  log.verbose('Forcing exit');
  process.exit(0);
}
