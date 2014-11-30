var Builder = require( '../lib/builder.js' ),
    Code = require( 'code' ),
    Lab = require( 'lab' ),
    lab = exports.lab = Lab.script();

var internals = {

    template: {

        table: function ( table, columns, drop )
        {
        },

        columns: function ( table, columns, drop )
        {
        },

        changeKeys: function ( table, keys, drop, index )
        {
        },

        keys: function ( table, keys, drop, index )
        {
        },

        engine: function ( table, engines, drop )
        {
        }
    },

    driver: {

        capabilities: [
            'tables', 'views', 'functions', 'procedures',
            'indizies', 'foreign_keys', 'engines'
        ],

        getTables: function ( config, callback )
        {
        },

        getColumns: function ( config, tables, context, callback )
        {
        },

        getFn: function ( config, callback )
        {
        },

        getEngine: function ( config, context, callback )
        {
        },

        getIndizies: function ( config, tables, context, callback )
        {
        },

        getFK: function ( config, tables, context, callback )
        {
        },

        close: function ()
        {
        }
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


    lab.experiment( 'subArr', { parallel: true }, function ()
    {

        lab.test( 'returns true if the element itself is null or undefined', { parallel: true }, function ( done )
        {

            Code.expect( build.subArr( undefined, [] ) ).equal( undefined );
            done();
        } );

        lab.test( 'returns true when the processed array was substracted as expected, single layer', { parallel: true }, function ( done )
        {

            var finArr = [ 'test2', 'test4', 'test5' ],
                subArr = [ 'test1', 'test3' ],
                testArr = [ 'test1', 'test2', 'test3', 'test4', 'test5' ];


            var actual = build.subArr( testArr, subArr );

            Code.expect( actual ).to.be.an.array();
            Code.expect( actual ).to.deep.equal( finArr );
            done();
        } );

        lab.test( 'returns true when the processed array was substracted as expected, double layer (only first element counts)', { parallel: true }, function ( done )
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


    lab.experiment( 'matchArr', { parallel: true }, function ()
    {

        lab.test( 'returns true if the element itself is null or undefined', { parallel: true }, function ( done )
        {

            Code.expect( build.matchArr( undefined, [] ) ).equal( undefined );
            done();
        } );

        lab.test( 'returns true when the processed array was substracted as expected, single layer', { parallel: true }, function ( done )
        {

            var finArr = [ 'test1' ],
                matchArr = [ 'test1', 'test3' ],
                testArr = [ 'test1', 'test2', 'test4', 'test5' ];


            var actual = build.matchArr( testArr, matchArr );

            Code.expect( actual ).to.be.an.array();
            Code.expect( actual ).to.deep.equal( finArr );
            done();
        } );

        lab.test( 'returns true when the processed array was substracted as expected, double layer (only first element counts)', { parallel: true }, function ( done )
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

    lab.experiment( 'buildArr', { parallel: true }, function ()
    {

        lab.test( 'returns true if one element itself is null or undefined and the other one gets returned', { parallel: true }, function ( done )
        {

            Code.expect( build.buildArr( undefined ) ).equal( undefined );
            done();
        } );

        lab.test( 'returns true when the processed array was build correctly', { parallel: true }, function ( done )
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

    lab.experiment( 'diffArr', { parallel: true }, function ()
    {

        lab.test( 'returns true if the element itself is null or undefined', { parallel: true }, function ( done )
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

        lab.test( 'returns true when the processed array differences are correct, single layer', { parallel: true }, function ( done )
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

        lab.test( 'returns true when the processed array differences are correct, double layer (only first element)', { parallel: true }, function ( done )
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

    lab.experiment( 'moveItem', { parallel: true }, function ()
    {

        lab.test( 'returns true if the given index is the same, the **same** array which was inputted should be returned', { parallel: true }, function( done )
        {
            var inputArr = [ 'test2', 'test3', 'test4', 'test5', 'test1' ];

            var actual = build.moveItem( inputArr, 2, 2 );

            Code.expect( actual ).equal( inputArr );

            done();
        } );

        lab.test( 'returns true if the given index was moved to the wished new index, less to high index', { parallel: true }, function ( done )
        {

            var finArr = [],
                pairs = [],
                inputArr = [
                    [ 'test2', 'test3', 'test4', 'test5', 'test1' ]
                ];

            finArr[0] = [
                [ 'test3', 'test4', 'test2', 'test5', 'test1' ]
            ];
            finArr[1] = [
                [ 'test2', 'test4', 'test5', 'test3', 'test1' ]
            ];
            finArr[2] = [
                [ 'test2', 'test3', 'test5', 'test1', 'test4' ]
            ];

            pairs[0] = [ 0, 2 ];
            pairs[1] = [ 1, 3 ];
            pairs[2] = [ 2, 4 ];

            for( var i = 0; i < finArr.length; ++i )
            {
                var actual = build.moveItem( inputArr, pairs[ i ][ 0 ], pairs[ i ][ 1 ] );

                Code.expect( actual ).to.be.an.array();
                Code.expect( actual ).to.deep.equal( finArr[ i ] );
            }

            done();
        } );

        lab.test( 'returns true if the given index was moved to the wished new index, less to high index + overwrite mode', { parallel: true }, function ( done )
        {

            var finArr = [],
                pairs = [],
                inputArr = [
                    [ 'test2', 'test3', 'test4', 'test5', 'test1' ]
                ];

            finArr[0] = [
                [ 'test3', 'test4', 'test2', 'test1' ]
            ];
            finArr[1] = [
                [ 'test2', 'test4', 'test3', 'test1' ]
            ];
            finArr[2] = [
                [ 'test2', 'test3', 'test5', 'test4' ]
            ];

            pairs[0] = [ 0, 3 ];
            pairs[1] = [ 1, 3 ];
            pairs[2] = [ 2, 4 ];

            for( var i = 0; i < finArr.length; ++i )
            {
                var actual = build.moveItem( inputArr, pairs[ i ][ 0 ], pairs[ i ][ 1 ], true );

                Code.expect( actual ).to.be.an.array();
                Code.expect( actual ).to.deep.equal( finArr[ i ] );
            }

            done();
        } );

        lab.test( 'returns true if the given index was moved to the wished new index, high to less index', { parallel: true }, function ( done )
        {

            var finArr = [],
                pairs = [],
                inputArr = [
                    [ 'test2', 'test3', 'test4', 'test5', 'test1' ]
                ];

            finArr[0] = [
                [ 'test1', 'test2', 'test3', 'test4', 'test5' ]
            ];
            finArr[1] = [
                [ 'test2', 'test5', 'test3', 'test4', 'test1' ]
            ];
            finArr[2] = [
                [ 'test2', 'test3', 'test1', 'test4', 'test5' ]
            ];

            pairs[0] = [ 4, 0 ];
            pairs[1] = [ 3, 1 ];
            pairs[2] = [ 4, 2 ];


            for( var i = 0; i < finArr.length; ++i )
            {
                var actual = build.moveItem( inputArr, pairs[ i ][ 0 ], pairs[ i ][ 1 ] );

                Code.expect( actual ).to.be.an.array();
                Code.expect( actual ).to.deep.equal( finArr[ i ] );
            }
            
            done();
        } );

        lab.test( 'returns true if the given index was moved to the wished new index, high to less index + overwrite mode', { parallel: true }, function ( done )
        {

            var finArr = [],
                pairs = [],
                inputArr = [
                    [ 'test2', 'test3', 'test4', 'test5', 'test1' ]
                ];

            finArr[0] = [
                [ 'test1', 'test3', 'test4', 'test5' ]
            ];
            finArr[1] = [
                [ 'test2', 'test5', 'test4', 'test1' ]
            ];
            finArr[2] = [
                [ 'test2', 'test3', 'test1', 'test5' ]
            ];

            pairs[0] = [ 4, 0 ];
            pairs[1] = [ 3, 1 ];
            pairs[2] = [ 4, 2 ];

            for( var i = 0; i < finArr.length; ++i )
            {
                var actual = build.moveItem( inputArr, pairs[ i ][ 0 ], pairs[ i ][ 1 ], true );

                Code.expect( actual ).to.be.an.array();
                Code.expect( actual ).to.deep.equal( finArr[ i ] );
            }

            done();
        } );
    } );
} );

lab.experiment( 'builder', function() 
{

    var build = new Builder(
        internals.driver,
        internals.template,
        'test/migrations'
    );
} );

