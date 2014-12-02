var Builder = require( '../lib/util.js' ),
    Code = require( 'code' ),
    Lab = require( 'lab' ),
    lab = exports.lab = Lab.script();


lab.experiment( 'array/', function ()
{

    lab.experiment( 'identicalTo',
    {
        parallel: true
    }, function ()
    {
        lab.test( 'returns true if the element itself is null or undefined',
        {
            parallel: true
        }, function ( done )
        {

            var data = [ '12', [ '12', [ '16' ] ],
                    [
                        [
                            [ 'yes sir' ]
                        ]
                    ]
                ],
                data2 = [];

            Code.expect( data.identicalTo( [ 'test', [ 'test' ],
                [
                    [
                        [ 'next' ]
                    ]
                ]
            ] ) ).to.be.a.boolean().and.to.equal( false );

            data2 = data.slice();


            Code.expect( data.identicalTo( data2 ) ).to.be.a.boolean().and.to.equal( true );
            Code.expect( data.identicalTo( [ 'one', 'two' ] ) ).to.be.a.boolean().and.to.equal( false );
            Code.expect( data.identicalTo( [ '12', [ '12', [ '16' ] ], 'test' ] ) ).to.be.a.boolean().and.to.equal( false );

            done();
        } );
    } );
} );