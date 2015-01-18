[![Build Status](https://travis-ci.org/wzrdtales/node-ultimate-migrate.svg?branch=master)](https://travis-ci.org/wzrdtales/node-ultimate-migrate) 
[![Documentation Status](https://readthedocs.org/projects/umigrate/badge/?version=latest)](https://readthedocs.org/projects/umigrate/?badge=latest) 
[![Dependency Status](https://david-dm.org/wzrdtales/node-ultimate-migrate.svg)](https://david-dm.org/wzrdtales/node-ultimate-migrate) 
[![devDependency Status](https://david-dm.org/wzrdtales/node-ultimate-migrate/dev-status.svg)](https://david-dm.org/wzrdtales/node-ultimate-migrate#info=devDependencies)

# Ultimate Migrate (BETA)

A extendable X Language and X Database Migration, Migration generation and Database difftool.

**Note:** Please not that this release is a **BETA Version**, it might be buggy,
but backward compatibility will be tried to be preserved from this point now.

If there occur any breaking changes, you will find it under issues tagged by
breaking changes.

# Docs

[Documentation](http://umigrate.readthedocs.org/en/latest/)

## Installation

    $ npm install -g umigrate

Don't forget to prepend sudo if you're not using your root Account on *nix like Systems.

Having problems while installation? Reading this may solve all your problems!

## Supported Databases

 * MariaDB(MySQL) (https://github.com/mscdex/node-mariasql/)


## Usage

### Getting Started

To learn how to use umigrate read first the 
[configuration](http://umigrate.readthedocs.org/en/latest/usage/configuration/)
section and then the [getting started](http://umigrate.readthedocs.org/en/latest/usage/getting%20started/) 
section from the docs.

### Migrator

#### BuiltIn Migrator

Just now the Migrator part of this Application is a wrapper for [db-migrate](https://github.com/kunklejr/node-db-migrate/), you can use every command of [db-migrate](https://github.com/kunklejr/node-db-migrate/) by replacing just the command `db-migrate` with `umigrate`. Please refer to their documentation for further Information.

In the future I'm going to contribute to [db-migrate](https://github.com/kunklejr/node-db-migrate/), to make it more feature complete.

#### Custom Migrator

There are two possibilities to use a custom migrator together with this tool. The first is, use an existing Interface (just now there doesn't exist another one apart of the [db-migrate](https://github.com/kunklejr/node-db-migrate/) Interface, but they will follow in near feature). The second is, to write your own.

Please read the [docs](http://umigrate.readthedocs.org/en/latest/developers/templates/creatingOwnTemplate/) 
for further Information.


### General/Dumper


```shell
Usage: umigrate [up|down|create|dump] migrationName [options]

Options:
  --env, -e               The environment to run the migrations under (dev, test, prod).                      
  --migrations-dir, -m    The directory containing your migration files.                                        [default: "./migrations"]
  --count, -c             Max number of migrations to run.                                                    
  --dry-run               Prints the SQL but doesn't run it.                                                    [boolean]
  --force-exit            Forcibly exit the migration process on completion.                                    [boolean]  [default: false]
  --verbose, -v           Verbose mode.                                                                         [default: false]
  --version, -i           Print version info.                                                                   [boolean]
  --diffdb, -d            Specify manually a DataBase to diff.                                                
  --cross-compatible, -x  Dumper will run in compatible mode. By default everything generic keeps x-compatible  [default: false]
  --template, -t          Specify which tempĺate to use.                                                      
  --config                Location of the database.json file.                                                   [string]  [default: "./database.json"]
```

#### Execute Dump

    $ umigrate dump

You might set further options, you can apply in your database config or append them in your command line.


#### Configure Database

You need to specify a database.json file, this must be by default in your path where you're executing `umigrate`. Alternatively you can specify your config file by --config.

A config file looks like this.

```json
{
   "dev": {
      "driver": "mysql",
      "altDriver": "mariasql",
      "host": "localhost",
      "user": "root",
      "password": "root",
      "database": "test",
      "multiStatements": true,
      "template": "db-migrate",
      "filestring": "%action%_%filename%",
      "primary": true
   }
}

```

##### driver
The `driver` is an overall parameter that will apply also to the wrapped [db-migrate](https://github.com/kunklejr/node-db-migrate/), while `altDriver` is an optional parameter which only applies to `umigrate` itself.

##### template
The `template` specifies which output format the generator should use.

##### filestring
The `filestring` enables you to provide ur wished output filename format. The keywords which are filled by `umigrate` are `%action%` which is filled for example by `dropTable` and `%filename%` which gets filled by the name of the table.
A final filename looks like this:

    date-dropTable_exampleTable

The date format can't be specified. Also the date gets an iterator added which increase the time by 1 second per iterator count, because the date only consists out of YDMhms and the execution order would get confused by multiple files having the same time. The final date may looks like this:

    20140831125739


##### multiStatements
The `multiStatements` parameter is [mariasql](https://github.com/mscdex/node-mariasql/) specific and has to be set to true if using the [mariasql](https://github.com/mscdex/node-mariasql/) driver.

##### primary
The `primary` parameter specifies if a primary key should be appended to the table creation or column instead of getting separated together with all other keys.

## Goals

 * Completely independent from the Database used (X Database)

I want to be able to switch between Databases at any time, without having to care about compatibility of the existing Migrations.

 * Completely independent from the Migrator used (X Language)

I want to be able to use a different Migrator (for example Laravel Migrations).
 * Support of all specific and standard features of Databases
 * No need for writing Migrations manually, unless non deterministic actions have been done (renaming)

## Contribute

You want to contribute? Great!

You can read the cs rules in the `.jscsrc` file or directly use it with jscs. I would advise advise you to use `Sublime Linter` + `JSCS` and `JSHINT`. Also I prefer the `Allman Style`, so you might use it, too.

If you open a pull request, make sure that you've covered your changes with tests. A pull request without appropiate tests wont be merged, unless I've got the time to write the tests myself.

To check tests and codestyles you can run:

    $ make

To make things easier you can also use the `sublime text` plugin `code formatter`, with the following config:

```json
{        
    "codeformatter_js_options":
    {
        "indent_size": 4, // indentation size
        "indent_char": " ", // Indent character
        "indent_with_tabs": false, // Indent with one tab (overrides indent_size and indent_char options)
        "preserve_newlines": true, // whether existing line breaks should be preserved,
        "max_preserve_newlines": 10, // maximum number of line breaks to be preserved in one chunk
        "space_in_paren": true, // Add padding spaces within paren, ie. f( a, b )
        "e4x": false, // Pass E4X xml literals through untouched
        "jslint_happy": true, // if true, then jslint-stricter mode is enforced. Example function () vs function()
        "brace_style": "expand", // "collapse" | "expand" | "end-expand". put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.
        "keep_array_indentation": false, // keep array identation.
        "keep_function_indentation": false, // keep function identation.
        "eval_code": false, // eval code
        "unescape_strings": false, // Decode printable characters encoded in xNN notation
        "wrap_line_length": 0, // Wrap lines at next opportunity after N characters
        "break_chained_methods": false // Break chained method calls across subsequent lines
    }
}
```

## FAQ

 * Why did you decided to write another migrator?

Well I didn't decided to do this exactly, more then I wanted to create a Migration Helper instead of writing my own Migrator. I like the concept behind Migrations, but I hate it to do things twice. When I was working on any Database I already knew that I have to transfer my changes to the Migrations. Bad enough, but the true pain is to setup Migrations for an old project and transcribe the whole Schema.
There are several tools out there, that pretend to help me with this. But finally they just generated more pain, then before. This is the final reason I decided to work on a full featured Database Migration Helper, which will include in some later Releases a full featured Migrator itself. Probably still db-migrate, but feature complete. Hopefully...

 * Nothing happens when -x is used, why?

The option -x will probably become deprecated, as it has no functionality now and I'm not sure if I'm going to implement it. It is generally a product of an earlier design approach, which changed greatly while the development. I will review and revise this in near feature and then decide what to do.
This earlier design approach was to enable functionality that is currently not implemented, by enabling and disabling raw queries (and so disabling Database features) through -x. Later on I decided to not provide this step by step implementation with fallback to raw Queries.

 * Do you have plans for future releases?

Well..., yes. Just view the [Roadmap](https://github.com/wzrdtales/node-ultimate-migrate/blob/master/ROADMAP.md). 

 * Should I really don't care about Migration Compatiblity when switching Database Engines?

It depends, if you're switching between a Database Engine that supports foreign keys and one that do not and of course all relations are implemented outside the Database, you don't need to care.
But if you switch between a Database Engine that supports functions and one that don't, you're probably screwed.
It's all about making the right decisions.


 * Do you hate RAW Queries?

No, I love them and prefer them in most cases over any Abstraction. There is nearly no case I could think of, where I would prefer to not use RAW Queries. This project is one of this special cases. You can't provide Cross Compatibility without providing generic functionality, that can be translated to the different Database Engines and its specifications.

## Donate

If you like my work and it is helping you, please consider making a donation to help me keeping the development and support up. Thanks :)

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=H4CEDA2UTTP5A)

[![Donate Bitcoin to 1M7kvaeGGwRurRSkNfKdnsX26qaGF7bthp](https://blockchain.info//Resources/buttons/donate_64.png)](http://wizardtales.com/donate.html)

[![Donate via Gratipay](https://avatars1.githubusercontent.com/u/1744073?v=3&s=200)](https://gratipay.com/wzrdtales/)

## Contact

You may contact me via mail or xmpp( jabber ).

I prefer xmpp, it's safe if wished OTR is also available.

xmpp:tobi@wizardtales.com

[![View Testresults](https://xmpp.net/badge.php?domain=wizardtales.com)](https://xmpp.net/result.php?domain=wizardtales.com&type=client)

# License

[MIT](https://github.com/wzrdtales/node-ultimate-migrate/blob/master/LICENSE)