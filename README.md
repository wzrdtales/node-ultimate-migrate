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

There a two possibilities to use a custom migrator together with this tool. The first is, use an existing Interface (just now there don't exist any Interface). The second is, to write your own.

Please read the docs for further Information.


### General/Dumper


```
Usage: umigrate [up|down|create|dump] migrationName [options]

Down migrations are run in reverse run order, so migrationName is ignored for down migrations.
Use the --count option to control how many down migrations are run (default is 1).

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


## Goals

 * Completely independent from the DataBase used (X DataBase)
I want to be able to switch between Databases at any time, without having to care about compatibility of the existing Migrations.

 * Completely independent from the Migrator used (X language)
I want to be able to use a different Migrator (for example Laravel Migrations).

 * Support of all specific and standard features of DataBases

## FAQ

 * Why did you decided to write another migrator?
Well I didn't decided to do this exactly. I like the concept behind Migrations, but I hate it to do things twice. When I was working on any DataBase I already knew that I have to transfer my changes to the Migrations. Bad enough, but the true pain is to setup Migrations for an old project and transcribe the whole Schema.
There are severaly tools out there, that pretend to help me with this. But finally they just generated more pain, then before. This is the final reason I decided to work on a full featured DataBase Migration Helper.

 * Nothing happens when -x is used, why?
The option -x will become deprecated, as it has no functionality now and I'm not sure if I'm going to implement it. It is generally a product of an earlier design approach, which changed greatly while the development. I will review and revise this in near feature and then decide what to do.
This earlier design approach was to enable functionality that is currently not implemented, by enabling and disabling raw queries (and so disabling DataBase features) through -x. Later on I decided to not provide this step by step implementation with fallback to raw Queries.



## Donate

If you like my work and it is helping you, please consider making a donation to help me keeping the development and support up. Thanks :)

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=H4CEDA2UTTP5A)

[![Donate Bitcoin to 1M7kvaeGGwRurRSkNfKdnsX26qaGF7bthp](https://blockchain.info//Resources/buttons/donate_64.png)](http://wizardtales.com/donate.html)