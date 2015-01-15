var log = require( 'db-migrate/lib/log' );
var BaseTemplate = require( './base' );

exports.connect = function ( config, callback )
{
    var template, req;

    if ( config.template === undefined )
    {
        throw new Error( 'config must include a template key specifing which template to use' );
    }

    if( config.template && config.template.connect )
    {
        log.verbose( 'require dynamic template' );
        template = config.template;
    }
    else
    {
        req = './' + config.template;
        log.verbose( 'require:', req );
        template = require( req );
    }

    log.verbose( 'loading template' );
    template.connect( config, function ( err, db )
    {
        if ( err )
        {
            callback( err );
            return;
        }
        log.verbose( 'template ' + config.template + ' loaded' );
        callback( null, db );
    } );
};