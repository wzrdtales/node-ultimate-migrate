## Contribute

You want to contribute? Great!

You can read the cs rules in the `.jscsrc` file or directly use it with jscs. I would advise advise you to use `Sublime Linter` + `JSCS` and `JSHINT`. Also I prefer the `Allman Style`, so you might use it, too.

If you open a pull request, make sure that you've covered your changes with tests. A pull request without appropiate tests wont be merged, unless I've got the time to write the tests myself.

To check tests and codestyles you can run:

    $ make

To make things easier you can also use the `sublime text` plugin `code formatter`, with the following config:

```json
{
    "codeformatter_js_options":
    {
        "indent_size": 4, // indentation size
        "indent_char": " ", // Indent character
        "indent_with_tabs": false, // Indent with one tab (overrides indent_size and indent_char options)
        "preserve_newlines": true, // whether existing line breaks should be preserved,
        "max_preserve_newlines": 10, // maximum number of line breaks to be preserved in one chunk
        "space_in_paren": true, // Add padding spaces within paren, ie. f( a, b )
        "e4x": false, // Pass E4X xml literals through untouched
        "jslint_happy": true, // if true, then jslint-stricter mode is enforced. Example function () vs function()
        "brace_style": "expand", // "collapse" | "expand" | "end-expand". put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.
        "keep_array_indentation": false, // keep array identation.
        "keep_function_indentation": false, // keep function identation.
        "eval_code": false, // eval code
        "unescape_strings": false, // Decode printable characters encoded in xNN notation
        "wrap_line_length": 0, // Wrap lines at next opportunity after N characters
        "break_chained_methods": false // Break chained method calls across subsequent lines
    }
}
```

## Donate

If you like my work and it is helping you, please consider making a donation to help me keeping the development and support up. Thanks :)

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=H4CEDA2UTTP5A)

[![Donate Bitcoin to 1M7kvaeGGwRurRSkNfKdnsX26qaGF7bthp](https://blockchain.info//Resources/buttons/donate_64.png)](https://wizardtales.com/donate.html)

[![Donate via Gratipay](https://avatars1.githubusercontent.com/u/1744073?v=3&s=200)](https://gratipay.com/wzrdtales/)

## Contact

You may contact me via mail or xmpp( jabber ).

I prefer xmpp, it's safe if wished OTR is also available.

xmpp:tobi@wizardtales.com

[![View Testresults](https://xmpp.net/badge.php?domain=wizardtales.com)](https://xmpp.net/result.php?domain=wizardtales.com&type=client)