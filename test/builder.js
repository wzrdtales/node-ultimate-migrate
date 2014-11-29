var Builder = require( '../lib/builder.js' ),
    Code = require( 'code' ),
    Lab = require( 'lab' ),
    lab = exports.lab = Lab.script();

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


    lab.experiment( 'subArr', function ()
    {

        lab.test( 'returns true if the element itself is null or undefined', function ( done )
        {

            Code.expect( build.subArr( undefined, [] ) ).equal( undefined );
            done();
        } );

        lab.test( 'returns true when the processed array was substracted as expected, single layer', function ( done )
        {

            var finArr = [ 'test2', 'test4', 'test5' ],
                subArr = [ 'test1', 'test3' ],
                testArr = [ 'test1', 'test2', 'test3', 'test4', 'test5' ];


            var actual = build.subArr( testArr, subArr );

            Code.expect( actual ).to.be.an.array();
            Code.expect( actual ).to.deep.equal( finArr );
            done();
        } );

        lab.test( 'returns true when the processed array was substracted as expected, double layer (only first element counts)', function ( done )
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

    lab.experiment( 'buildArr', function ()
    {

        lab.test( 'returns true if one element itself is null or undefined and the other one gets returned', function ( done )
        {

            Code.expect( build.buildArr( undefined ) ).equal( undefined );
            done();
        } );

        lab.test( 'returns true when the processed array was build correctly', function ( done )
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

    lab.experiment( 'diffArr', function ()
    {

        lab.test( 'returns true if the element itself is null or undefined', function ( done )
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

        lab.test( 'returns true when the processed array differences are correct, single layer', function ( done )
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

        lab.test( 'returns true when the processed array differences are correct, double layer (only first element)', function ( done )
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
} );