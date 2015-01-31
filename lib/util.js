Array.prototype.identicalTo = function ( testArr )
{
    if ( this.length !== testArr.length ) return false;
    for ( var i = 0; i < testArr.length; i++ )
    {
        if ( this[ i ] && this[ i ].identicalTo )
        {
            if ( !this[ i ].identicalTo( testArr[ i ] ) ) return false;
        }
        else if ( this[ i ] !== testArr[ i ] )
        {
            return false;
        }
    }
    return true;
};