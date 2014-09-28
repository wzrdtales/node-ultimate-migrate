var log = require( 'db-migrate/lib/log' );

exports.connect = function ( config, callback )
{
    if ( config.template === undefined )
    {
        throw new Error( 'config must include a template key specifing which template to use' );
    }

    var req = './' + config.template;
    log.verbose( 'require:', req );
    var template = require( req );
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