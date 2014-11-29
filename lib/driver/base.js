var log = require( 'db-migrate/lib/log' );

function BaseDriver()
{}

BaseDriver.prototype = {

    /**
     * Returns an array containing the Tables.
     *
     * General return information:
     *
     * This array has 2 layers, the final information layer has
     * 8 elements.
     *
     * Array Format:
     * Layer 1:
     * [0] = real table, [1] = diff table
     *
     * Layer 3 (Result formatting):
     * [0] = table array*, [1] = view array*
     *
     * Table Array (Content)
     * List of table name per array element
     *
     * View Array (Content)
     * List of view name per array element
     *
     * @return array
     */
    getTables: function ( config, callback )
    {
        throw new Error( 'not implemented' );
    },

    /**
     * Returns an array containing the Columns.
     *
     * General return information:
     *
     * This array has 3 layers, the final information layer has
     * 8 elements.
     *
     * Array Format:
     * Layer 1:
     * [0] = real table, [1] = diff table
     *
     * Layer 2:
     * ['tablename'] = Array for final table indizies information
     *
     * Layer 3 (Result formatting):
     * [0] = Column name, [1] = Column Information Array*, [2] = Nullable,
     * [3] = default value, [4] = Primary Key,
     * [5] = extra*
     *
     * Column Information Array (Nested formatting)
     * [0] = datatye, [1] = length, [2] = signed/unsigned
     *
     * Extra (Possible Values)
     * null/undefined
     * ai
     * OUCT
     * custom value
     *
     * @return array
     */
    getColumns: function ( config, tables, context, callback )
    {
        throw new Error( 'not implemented' );
    },

    /**
     * No specification yet.
     *
     * @return useless
     */
    getFn: function ( config, callback )
    {
        log.verbose( 'Not implemented' );
    },

    /**
     * Returns an array containing the engine information.
     * This might be only MariaDB/MySQL specific!
     *
     * General return information:
     *
     * This array has 2 layer, the final information layer has
     * 2 elements.
     *
     * Array Format:
     * Layer 1:
     * [0] = real table, [1] = diff table
     *
     * Layer 2 (Result formatting):
     * [0] = table name, [1] = engine
     *
     * @return array
     */
    getEngine: function ( config, context, callback )
    {
        log.verbose( 'Not implemented' );
    },

    /**
     * Returns an array containing the indizies.
     *
     * General return information:
     *
     * This array has 3 layers, the final information layer has
     * 6 elements.
     *
     * Array Format:
     * Layer 1:
     * [0] = real table, [1] = diff table
     *
     * Layer 2:
     * ['tablename'] = Array for final table indizies information
     *
     * Layer 3 (Result formatting):
     * [0] = key name, [1] = unique( true or false ),
     * [2] = Position of column in index (Sequence in index),
     * [3] = column name, [4] = Nullable, [5] = index type
     *
     * @return array
     */
    getIndizies: function ( config, tables, context, callback )
    {
        log.verbose( 'Not implemented' );
    },

    /**
     * Returns an array containing the foreign keys.
     *
     * General return information:
     *
     * This array has 3 layers, the final information layer has
     * 8 elements.
     *
     * Array Format:
     * Layer 1:
     * [0] = real table, [1] = diff table
     *
     * Layer 2:
     * ['tablename'] = Array for final table indizies information
     *
     * Layer 3 (Result formatting):
     * [0] = foreign_key_name, [1] = column_name, [2] = referenced_table_schema,
     * [3] = referenced_table_name, [4] = referenced_column_name,
     * [5] = position_in_unique_constraint, [6] = on_update,
     * [7] = on_delete
     *
     * @return array
     */
    getFK: function ( config, tables, context, callback )
    {
        log.verbose( 'Not implemented' );
    },

    close: function ()
    {
        log.verbose( 'Not implemented' );
    }

};


module.exports = BaseDriver;