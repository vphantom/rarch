JSLINT     := node_modules/.bin/eslint --fix
TAP        := node_modules/.bin/faucet
ISTANBUL   := node_modules/.bin/istanbul

help:
	echo "Try one of: clean, lint, test"

clean:
	rm -fr coverage

lint:
	$(JSLINT) rarch.js test/index.js

test:
	$(ISTANBUL) cover --print none --report lcov -x 'test/*' test/index.js |$(TAP)
	$(ISTANBUL) report text-summary

.PHONY: help clean lint test

.SILENT:	help test
