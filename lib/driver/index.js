log = require( 'db-migrate/lib/log' );

exports.connect = function ( config, callback )
{
    var driver, req;

    if ( config.driver === undefined || config.altDriver === undefined )
    {
        throw new Error( 'config must include a driver key specifing which driver to use' );
    }

    if( config.altDriver && typeof( config.altDriver ) === 'object' )
    {
        log.verbose( 'require:', config.altDriver.require );
        driver = require( config.altDriver.require );
    }
    else
    {
        req = './' + ( config.altDriver || config.driver );
        log.verbose( 'require:', req );
        driver = require( req );
    }
    
    log.verbose( 'connecting' );
    driver.connect( config, function ( err, db )
    {

        if ( err )
        {

            callback( err );
            return;
        }
        log.verbose( 'connected' );
        callback( null, db );
    } );
};