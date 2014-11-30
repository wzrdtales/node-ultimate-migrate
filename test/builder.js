global.dryRun = true;

var Builder = require( '../lib/builder.js' ),
    Code = require( 'code' ),
    Lab = require( 'lab' ),
    lab = exports.lab = Lab.script();

var internals = {


    template:
    {
        _table: {},
        _columns: {},
        _changeKeys: {},
        _keys: {},
        _engine: {},

        table: function ( table, columns, drop )
        {

            this._table.table = table;
            this._table.columns = columns;

            return 'var test = test;'; //return to activate write function
        },

        columns: function ( table, columns, drop ) 
        {

            this._columns.table = table;
            this._columns.columns = columns;
        },

        changeKeys: function ( table, keys, drop, index ) 
        {

            this._changeKeys.table = table;
            this._changeKeys.keys = keys;
        },

        keys: function ( table, keys, drop, index ) 
        {

            this._keys.table = table;
            this._keys.keys = keys;
        },

        engine: function ( table, engines, drop ) 
        {

            this._engine.table = table;
            this._engine.engines = engines;
        }
    },

    driver:
    {

        capabilities: [
            'tables', 'views', 'engines', 'indizies'
        ],

        getTables: function ( config, callback )
        {
            callback( [
                [
                    [ 'atew', 'definetly', 'deleted', 'test' ],
                    [ 'tew' ]
                ],
                [
                    [ 'atew', 'definetly', 'test', 'test2' ],
                    [ 'tew' ]
                ]
            ] );
        },

        getColumns: function ( config, tables, context, callback )
        {
            var data = [];

            data[ 0 ] = [];
            data[ 1 ] = [];

            data[ 0 ].atew = [
                [ 'te', [ 'double', '11,3', 'unsigned' ],
                    false,
                    '0.000',
                    false,
                    ''
                ],
                [ 'lol', [ 'varchar', '255', 0 ], true, null, false, '' ],
                [ 'id', [ 'int', '10', 'unsigned' ], false, null, false, '' ],
                [ 'lol__id', [ 'int', '11', 0 ], false, null, false, '' ],
                [ 'test', [ 'timestamp', 0, 0 ], true, null, false, '' ],
                [ 'twocolumns', [ 'int', '11', 0 ], false, null, true, '' ]
            ];

            data[ 0 ].definetly = [
                [ 'lolwtf', [ 'int', '9', 0 ], true, null, false, '' ]
            ];

            data[ 0 ].test = [
                [ 'cdid', [ 'int', '10', 'unsigned' ], false, null, true, '' ],
                [ 'test', [ 'varchar', '255', 0 ], true, null, false, '' ],
                [ 'rofl_id', [ 'int', '11', 0 ], false, null, false, '' ]
            ];

            data[ 0 ].deleted = [
                [ 'id', [ 'int', '10', 'unsigned' ], false, null, false, '' ]
            ];

            data[ 1 ].atew = [
                [ 'te', [ 'double', '11,3', 'unsigned' ],
                    false,
                    '0.000',
                    false,
                    ''
                ],
                [ 'lol', [ 'varchar', '255', 0 ], true, null, false, '' ],
                [ 'id', [ 'int', '10', 'unsigned' ], false, null, false, '' ],
                [ 'lol__id', [ 'int', '11', 0 ], false, null, false, '' ],
                [ 'test', [ 'timestamp', 0, 0 ],
                    false,
                    'CURRENT_TIMESTAMP',
                    false,
                    'OUCT'
                ],
                [ 'twocolumns', [ 'int', '11', 0 ], false, null, true, '' ]
            ];

            data[ 1 ].definetly = [
                [ 'lolwtf', [ 'int', '9', 0 ], true, null, false, '' ]
            ];

            data[ 1 ].test = [
                [ 'cdid', [ 'int', '10', 'unsigned' ], false, null, true, '' ],
                [ 'test', [ 'varchar', '255', 0 ], true, null, false, '' ],
                [ 'rofl_id', [ 'int', '11', 0 ], false, null, false, '' ]
            ];

            data[ 1 ].test2 = [
                [ 'id', [ 'int', '10', 'unsigned' ], false, null, false, '' ]
            ];


            callback( context, data );
        },

        getFn: function ( config, callback ) {},

        getEngine: function ( config, context, callback )
        {

            var data = [
                [
                    [ 'atew', 'InnoDB' ],
                    [ 'definetly', 'InnoDB' ],
                    [ 'test', 'InnoDB' ],
                    [ 'tew', null ]
                ],
                [
                    [ 'atew', 'InnoDB' ],
                    [ 'definetly', 'InnoDB' ],
                    [ 'test', 'InnoDB' ],
                    [ 'tew', null ]
                ]
            ];

            callback( context, data );
        },

        getIndizies: function ( config, tables, context, callback )
        {
            var data = [];
            data[ 0 ] = [];
            data[ 1 ] = [];


            data[ 0 ].atew = [
                [ 'PRIMARY', true, '1', 'twocolumns', false, 'BTREE', '', '' ],
                [ 'fktotest', true, '1', 'id', false, 'BTREE', '', '' ],
                [ 'fktotest', true, '2', 'lol__id', false, 'BTREE', '', '' ],
                [ 'ter', true, '1', 'te', false, 'BTREE', '', '' ],
                [ 'ter', true, '2', 'lol', true, 'BTREE', '', '' ],
                [ 'hthes', false, '1', 'te', false, 'BTREE', '', '' ],
                [ 'roflxD', false, '1', 'lol', true, 'BTREE', '', '' ]
            ];

            data[ 0 ].test = [
                [ 'PRIMARY', true, '1', 'cdid', false, 'BTREE', '', '' ],
                [ 'cdid', false, '1', 'cdid', false, 'BTREE', '', '' ],
                [ 'cdid_2', false, '1', 'cdid', false, 'BTREE', '', '' ],
                [ 'cdid_2', false, '2', 'rofl_id', false, 'BTREE', '', '' ]
            ];

            data[ 1 ].atew = [
                [ 'PRIMARY', true, '1', 'twocolumns', false, 'BTREE', '', '' ],
                [ 'fktotest', true, '1', 'id', false, 'BTREE', '', '' ],
                [ 'fktotest', true, '2', 'lol__id', false, 'BTREE', '', '' ],
                [ 'ter', true, '1', 'te', false, 'BTREE', '', '' ],
                [ 'ter', true, '2', 'lol', true, 'BTREE', '', '' ],
                [ 'hthes', false, '1', 'te', false, 'BTREE', '', '' ],
                [ 'roflxD', false, '1', 'lol', true, 'BTREE', '', '' ]
            ];

            data[ 1 ].test = [
                [ 'PRIMARY', true, '1', 'cdid', false, 'BTREE', '', '' ],
                [ 'cdid', false, '1', 'cdid', false, 'BTREE', '', '' ],
                [ 'cdid_2', false, '1', 'cdid', false, 'BTREE', '', '' ],
                [ 'cdid_2', false, '2', 'rofl_id', false, 'BTREE', '', '' ]
            ];

            callback( context, data );
        },

        getFK: function ( config, tables, context, callback ) {},

        close: function () {}
    },

    config:
    {

        filestring: '%action%_%filename%',
        primary: true,
        beautifier: 'js-beautify',

        beautifier_options:
        {
            indent_size: 4,
            indent_char: ' ',
            indent_with_tabs: false,
            preserve_newlines: true,
            max_preserve_newlines: 10,
            space_in_paren: true,
            e4x: false,
            jslint_happy: true,
            brace_style: 'expand',
            keep_array_indentation: false,
            keep_function_indentation: false,
            eval_code: false,
            unescape_strings: false,
            wrap_line_length: 0,
            break_chained_methods: false
        },
        db_persist: true
    }
};

lab.experiment( 'builder/', function ()
{

    var build = new Builder(

        {
            capabilities:
            {}
        },
        undefined,
        'test/migrations'
    );


    lab.experiment( 'subArr',
    {
        parallel: false
    }, function ()
    {

        lab.test( 'returns true if the element itself is null or undefined',
        {
            parallel: false
        }, function ( done )
        {

            Code.expect( build.subArr( undefined, [] ) ).equal( undefined );
            done();
        } );

        lab.test( 'returns true when the processed array was substracted as expected, single layer',
        {
            parallel: false
        }, function ( done )
        {

            var finArr = [ 'test2', 'test4', 'test5' ],
                subArr = [ 'test1', 'test3' ],
                testArr = [ 'test1', 'test2', 'test3', 'test4', 'test5' ];


            var actual = build.subArr( testArr, subArr );

            Code.expect( actual ).to.be.an.array();
            Code.expect( actual ).to.deep.equal( finArr );
            done();
        } );

        lab.test( 'returns true when the processed array was substracted as expected, double layer (only first element counts)',
        {
            parallel: false
        }, function ( done )
        {

            var finArr = [
                [ 'test1', 'test2', 'test3' ],
                [ 'test5', 'test6' ]
            ],
                subArr = [
                    [ 'test4', 'test1' ],
                    [ 'test9', 'test5' ]
                ],
                testArr = [
                    [ 'test1', 'test2', 'test3' ],
                    [ 'test4', 'undefined' ],
                    [ 'test5', 'test6' ]
                ];


            var actual = build.subArr( testArr, subArr );

            Code.expect( actual ).to.be.an.array();
            Code.expect( actual ).to.deep.equal( finArr );
            done();
        } );
    } );


    lab.experiment( 'matchArr',
    {
        parallel: false
    }, function ()
    {

        lab.test( 'returns true if the element itself is null or undefined',
        {
            parallel: false
        }, function ( done )
        {

            Code.expect( build.matchArr( undefined, [] ) ).equal( undefined );
            done();
        } );

        lab.test( 'returns true when the processed array was substracted as expected, single layer',
        {
            parallel: false
        }, function ( done )
        {

            var finArr = [ 'test1' ],
                matchArr = [ 'test1', 'test3' ],
                testArr = [ 'test1', 'test2', 'test4', 'test5' ];


            var actual = build.matchArr( testArr, matchArr );

            Code.expect( actual ).to.be.an.array();
            Code.expect( actual ).to.deep.equal( finArr );
            done();
        } );

        lab.test( 'returns true when the processed array was substracted as expected, double layer (only first element counts)',
        {
            parallel: false
        }, function ( done )
        {

            var finArr = [
                [ 'test4', 'undefined' ]
            ],
                matchArr = [
                    [ 'test4', 'test1' ],
                    [ 'test6', 'test5' ]
                ],
                testArr = [
                    [ 'test1', 'test2', 'test3' ],
                    [ 'test4', 'undefined' ],
                    [ 'test5', 'test6' ]
                ];


            var actual = build.matchArr( testArr, matchArr );

            Code.expect( actual ).to.be.an.array();
            Code.expect( actual ).to.deep.equal( finArr );
            done();
        } );
    } );

    lab.experiment( 'buildArr',
    {
        parallel: false
    }, function ()
    {

        lab.test( 'returns true if one element itself is null or undefined and the other one gets returned',
        {
            parallel: false
        }, function ( done )
        {

            Code.expect( build.buildArr( undefined ) ).equal( undefined );
            done();
        } );

        lab.test( 'returns true when the processed array was build correctly',
        {
            parallel: false
        }, function ( done )
        {

            var finObj = [],
                testArr = [
                    [ 'test1', 'test2', 'test3' ],
                    [ 'test4', 'test5', 'test6' ],
                    [ 'test8', 'test7', 'test3', 'test9' ]
                ];

            finObj.test3 = [
                [ 'test1', 'test2' ],
                [ 'test8', 'test7', 'test9' ]
            ];
            finObj.test6 = [
                [ 'test4', 'test5' ]
            ];

            var actual = build.buildArr( testArr, 2 );

            Code.expect( actual ).to.be.an.array();
            Code.expect( actual ).to.deep.equal( finObj );
            done();
        } );
    } );

    lab.experiment( 'diffArr',
    {
        parallel: false
    }, function ()
    {

        lab.test( 'returns true if the element itself is null or undefined',
        {
            parallel: false
        }, function ( done )
        {

            var finArr1 = [
                [],
                []
            ],
                finArr2 = [
                    [],
                    []
                ],
                diffArr1 = [ 'test1', 'test2' ],
                diffArr2 = [ 'test3', 'test4' ];

            finArr1[ 0 ] = diffArr1;
            finArr2[ 1 ] = diffArr2;


            var res1 = build.diffArr( diffArr1, undefined );
            var res2 = build.diffArr( undefined, diffArr2 );

            Code.expect( res1 ).to.be.an.array();
            Code.expect( res1 ).to.deep.equal( finArr1 );

            Code.expect( res2 ).to.be.an.array();
            Code.expect( res2 ).to.deep.equal( finArr2 );

            done();
        } );

        lab.test( 'returns true when the processed array differences are correct, single layer',
        {
            parallel: false
        }, function ( done )
        {

            var finArr = [
                [],
                [ 'test2', 'test4', 'test5' ]
            ],
                diffArr1 = [ 'test1', 'test3' ],
                diffArr2 = [ 'test1', 'test2', 'test3', 'test4', 'test5' ];

            var actual = build.diffArr( diffArr1, diffArr2 );

            Code.expect( actual ).to.be.an.array();
            Code.expect( actual ).to.deep.equal( finArr );
            done();
        } );

        lab.test( 'returns true when the processed array differences are correct, double layer (only first element)',
        {
            parallel: false
        }, function ( done )
        {

            var finArr = [
                [
                    [ 'test9', 'test5' ]
                ],
                [
                    [ 'test1', 'test2', 'test3' ],
                    [ 'test5', 'test6' ]
                ]
            ],
                diffArr1 = [
                    [ 'test4', 'test1' ],
                    [ 'test9', 'test5' ]
                ],
                diffArr2 = [
                    [ 'test1', 'test2', 'test3' ],
                    [ 'test4', 'undefined' ],
                    [ 'test5', 'test6' ]
                ];

            var actual = build.diffArr( diffArr1, diffArr2 );

            Code.expect( actual ).to.be.an.array();
            Code.expect( actual ).to.deep.equal( finArr );
            done();
        } );
    } );

    lab.experiment( 'moveItem',
    {
        parallel: false
    }, function ()
    {

        lab.test( 'returns true if the given index is the same, the **same** array which was inputted should be returned',
        {
            parallel: false
        }, function ( done )
        {
            var inputArr = [ 'test2', 'test3', 'test4', 'test5', 'test1' ];

            var actual = build.moveItem( inputArr, 2, 2 );

            Code.expect( actual ).equal( inputArr );

            done();
        } );

        lab.test( 'returns true if the given index was moved to the wished new index, less to high index',
        {
            parallel: false
        }, function ( done )
        {

            var finArr = [],
                pairs = [],
                inputArr = [
                    [ 'test2', 'test3', 'test4', 'test5', 'test1' ]
                ];

            finArr[ 0 ] = [
                [ 'test3', 'test4', 'test2', 'test5', 'test1' ]
            ];
            finArr[ 1 ] = [
                [ 'test2', 'test4', 'test5', 'test3', 'test1' ]
            ];
            finArr[ 2 ] = [
                [ 'test2', 'test3', 'test5', 'test1', 'test4' ]
            ];

            pairs[ 0 ] = [ 0, 2 ];
            pairs[ 1 ] = [ 1, 3 ];
            pairs[ 2 ] = [ 2, 4 ];

            for ( var i = 0; i < finArr.length; ++i )
            {
                var actual = build.moveItem( inputArr, pairs[ i ][ 0 ], pairs[ i ][ 1 ] );

                Code.expect( actual ).to.be.an.array();
                Code.expect( actual ).to.deep.equal( finArr[ i ] );
            }

            done();
        } );

        lab.test( 'returns true if the given index was moved to the wished new index, less to high index + overwrite mode',
        {
            parallel: false
        }, function ( done )
        {

            var finArr = [],
                pairs = [],
                inputArr = [
                    [ 'test2', 'test3', 'test4', 'test5', 'test1' ]
                ];

            finArr[ 0 ] = [
                [ 'test3', 'test4', 'test2', 'test1' ]
            ];
            finArr[ 1 ] = [
                [ 'test2', 'test4', 'test3', 'test1' ]
            ];
            finArr[ 2 ] = [
                [ 'test2', 'test3', 'test5', 'test4' ]
            ];

            pairs[ 0 ] = [ 0, 3 ];
            pairs[ 1 ] = [ 1, 3 ];
            pairs[ 2 ] = [ 2, 4 ];

            for ( var i = 0; i < finArr.length; ++i )
            {
                var actual = build.moveItem( inputArr, pairs[ i ][ 0 ], pairs[ i ][ 1 ], true );

                Code.expect( actual ).to.be.an.array();
                Code.expect( actual ).to.deep.equal( finArr[ i ] );
            }

            done();
        } );

        lab.test( 'returns true if the given index was moved to the wished new index, high to less index',
        {
            parallel: false
        }, function ( done )
        {

            var finArr = [],
                pairs = [],
                inputArr = [
                    [ 'test2', 'test3', 'test4', 'test5', 'test1' ]
                ];

            finArr[ 0 ] = [
                [ 'test1', 'test2', 'test3', 'test4', 'test5' ]
            ];
            finArr[ 1 ] = [
                [ 'test2', 'test5', 'test3', 'test4', 'test1' ]
            ];
            finArr[ 2 ] = [
                [ 'test2', 'test3', 'test1', 'test4', 'test5' ]
            ];

            pairs[ 0 ] = [ 4, 0 ];
            pairs[ 1 ] = [ 3, 1 ];
            pairs[ 2 ] = [ 4, 2 ];


            for ( var i = 0; i < finArr.length; ++i )
            {
                var actual = build.moveItem( inputArr, pairs[ i ][ 0 ], pairs[ i ][ 1 ] );

                Code.expect( actual ).to.be.an.array();
                Code.expect( actual ).to.deep.equal( finArr[ i ] );
            }

            done();
        } );

        lab.test( 'returns true if the given index was moved to the wished new index, high to less index + overwrite mode',
        {
            parallel: false
        }, function ( done )
        {

            var finArr = [],
                pairs = [],
                inputArr = [
                    [ 'test2', 'test3', 'test4', 'test5', 'test1' ]
                ];

            finArr[ 0 ] = [
                [ 'test1', 'test3', 'test4', 'test5' ]
            ];
            finArr[ 1 ] = [
                [ 'test2', 'test5', 'test4', 'test1' ]
            ];
            finArr[ 2 ] = [
                [ 'test2', 'test3', 'test1', 'test5' ]
            ];

            pairs[ 0 ] = [ 4, 0 ];
            pairs[ 1 ] = [ 3, 1 ];
            pairs[ 2 ] = [ 4, 2 ];

            for ( var i = 0; i < finArr.length; ++i )
            {
                var actual = build.moveItem( inputArr, pairs[ i ][ 0 ], pairs[ i ][ 1 ], true );

                Code.expect( actual ).to.be.an.array();
                Code.expect( actual ).to.deep.equal( finArr[ i ] );
            }

            done();
        } );
    } );
} );

lab.experiment( 'builder', function ()
{

    var build = new Builder(
        internals.driver,
        internals.template,
        'test/migrations'
    );

    lab.before( function ( done )
    {
        build.build( internals.config, function ( next )
        {

            next();
        }, done );
    } );


    lab.test( 'returns if driver was closed without problems', function ( done )
    {

        build.close();
        done();
    } );
} );