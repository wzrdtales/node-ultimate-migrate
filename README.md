# Ultimate Migrate

A X language and X DataBase Migration, Migration generation and DataBase difftool.

## Installation

    $ npm install -g umigrate

Don't forget to prepend sudo if you're not using your root Account on *nix like Systems.

## Supported Databases

 * MariaDB(MySQL) (https://github.com/mscdex/node-mariasql/)

## Usage

### Migrator

#### BuiltIn Migrator

Just now the Migrator part of this Application is a wrapper for [db-migrate](https://github.com/kunklejr/node-db-migrate/), you can use every command of `db-migrate` by replacing just the command `db-migrate` with `umigrate`. Please refer to their documentation for further Information.

In the future I'm going to contribute to db-migrate, to make it more feature complete.

#### Custom Migrator

There are two possibilities to use a custom migrator together with this tool. The first is, use an existing Interface (just now there don't exist any Interface). The second is, to write your own.

Please read the docs for further Information.


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


#### Configure DataBase

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

`date-dropTable_exampleTable`

The date format can't be specified. Also the date gets an iterator appended, because the date only consists out of YDMhms and the execution order would get confused by multiple files having the same time. The final date may looks like this:

`201408311257391`


##### multiStatements
The `multiStatements` parameter is [mariasql](https://github.com/mscdex/node-mariasql/) specific and has to be set to true if using the [mariasql](https://github.com/mscdex/node-mariasql/) driver.

##### primary
The `primary` parameter specifies if a primary key should be appended to the table creation or column instead of getting separated together with all other keys.

## Goals

 * Completely independent from the DataBase used (X DataBase)

I want to be able to switch between Databases at any time, without having to care about compatibility of the existing Migrations.

 * Completely independent from the Migrator used (X language)

I want to be able to use a different Migrator (for example Laravel Migrations).
 * Support of all specific and standard features of DataBases

## FAQ

 * Why did you decided to write another migrator?

Well I didn't decided to do this exactly. I like the concept behind Migrations, but I hate it to do things twice. When I was working on any DataBase I already knew that I have to transfer my changes to the Migrations. Bad enough, but the true pain is to setup Migrations for an old project and transcribe the whole Schema.
There are several tools out there, that pretend to help me with this. But finally they just generated more pain, then before. This is the final reason I decided to work on a full featured DataBase Migration Helper.

 * Nothing happens when -x is used, why?

The option -x will become deprecated, as it has no functionality now and I'm not sure if I'm going to implement it. It is generally a product of an earlier design approach, which changed greatly while the development. I will review and revise this in near feature and then decide what to do.
This earlier design approach was to enable functionality that is currently not implemented, by enabling and disabling raw queries (and so disabling DataBase features) through -x. Later on I decided to not provide this step by step implementation with fallback to raw Queries.



## Donate

If you like my work and it is helping you, please consider making a donation to help me keeping the development and support up. Thanks :)

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=H4CEDA2UTTP5A)

[![Donate Bitcoin to 1M7kvaeGGwRurRSkNfKdnsX26qaGF7bthp](https://blockchain.info//Resources/buttons/donate_64.png)](http://wizardtales.com/donate.html)