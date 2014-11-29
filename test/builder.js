var Code = require( 'code' ),
    Lab = require( 'lab' ),
    lab = exports.lab = Lab.script(),
    Builder = require( '../lib/builder.js' );

lab.experiment( 'builder/', function ()
{

	var build = new Builder(

		{ capabilities: {} },
		undefined,
		'test/migrations'
	);


	lab.experiment( 'subArr', function()
	{

		lab.test( 'returns true if the element itself, if it is null or unedfined', function ( done )
	    {

	        Code.expect( build.subArr( undefined, [] ) ).equal( undefined );
	        done();
	    } );
		
	    lab.test( 'returns true when the processed array was substracted as expected, single layer', function ( done )
	    {

	    	var subArr = [ 'test1', 'test3' ],
	    		testArr = [ 'test1', 'test2', 'test3', 'test4', 'test5' ],
	    		finArr = [ 'test2', 'test4', 'test5' ];


			var actual = build.subArr( testArr, subArr );

	        Code.expect( actual ).to.be.an.array();
	        Code.expect( actual ).to.deep.equal( finArr );
	        done();
	    } );

	    lab.test( 'returns true when the processed array was substracted as expected, double layer (only first element counts)', function ( done )
	    {

	    	var subArr  = [ [ 'test4', 'test1' ], [ 'test9', 'test5' ] ],
	    		testArr = [ [ 'test1', 'test2', 'test3' ], [ 'test4', 'undefined' ], [ 'test5', 'test6' ] ],
	    		finArr  = [ [ 'test1', 'test2', 'test3' ], [ 'test5', 'test6' ] ];


			var actual = build.subArr( testArr, subArr );

	        Code.expect( actual ).to.be.an.array();
	        Code.expect( actual ).to.deep.equal( finArr );
	        done();
	    } );
	} );

	lab.experiment( 'buildArr', function()
	{

		lab.test( 'returns true if the element itself, if it is null or unedfined', function ( done )
	    {

	        Code.expect( build.buildArr( undefined ) ).equal( undefined );
	        done();
	    } );

	    lab.test( 'returns true when the processed array was build correctly', function ( done )
	    {

	    	var testArr = [ [ 'test1', 'test2', 'test3' ], [ 'test4', 'test5', 'test6' ], [ 'test8', 'test7', 'test3', 'test9' ] ],
	    		finObj  = new Array();
	    		finObj['test3'] = [ [ 'test1', 'test2' ], [ 'test8', 'test7', 'test9' ] ];
	    		finObj['test6'] = [ [ 'test4', 'test5' ] ];


			var actual = build.buildArr( testArr, 2 );

	        Code.expect( actual ).to.be.an.array();
	        Code.expect( actual ).to.deep.equal( finObj );
	        done();
	    } );
	} );
} );