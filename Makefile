test:
	@node node_modules/lab/bin/lab -I Builder
	@node node_modules/jscs/bin/jscs {index.js,lib/*}
test-cov:
	@node node_modules/lab/bin/lab -t 90 -I Builder
test-cov-html:
	@node node_modules/lab/bin/lab -r html -o coverage.html -I Builder

.PHONY: test test-cov test-cov-html
