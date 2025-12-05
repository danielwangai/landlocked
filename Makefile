.PHONY: build test clean deploy

# Build the Anchor program
build:
	anchor build

# Run tests
test:
	anchor test

# Clean build artifacts
clean:
	anchor clean
	rm -rf target/
	rm -rf .anchor/

# Deploy the program
deploy:
	anchor deploy

