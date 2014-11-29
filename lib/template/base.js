function BaseTemplate()
{}

BaseTemplate.prototype = {

    table: function ( table, columns, drop )
    {
        throw new Error( 'not implemented' );
    },

    columns: function ( table, columns, drop )
    {
        throw new Error( 'not implemented' );
    },

    changeKeys: function ( table, keys, drop, index )
    {
        log.verbose( 'not implemented' );
    },

    keys: function ( table, keys, drop, index )
    {
        log.verbose( 'not implemented' );
    },

    engine: function ( table, engines, drop )
    {
        log.verbose( 'not implemented' );
    }
};

module.exports = BaseTemplate;
