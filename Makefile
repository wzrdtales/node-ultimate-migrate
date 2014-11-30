test:
	@node node_modules/lab/bin/lab -I Builder,dryRun
	@node node_modules/jscs/bin/jscs {index.js,lib/*}
test-cov:
	@node node_modules/lab/bin/lab -t 80 -I Builder,dryRun
test-cov-html:
	@node node_modules/lab/bin/lab -r html -o coverage.html -I Builder,dryRun

.PHONY: test test-cov test-cov-html
