#!/bin/sh
#
# Utility script to rebuild WASM module
#
emcc -std=c++11 -O2 --bind -s "MODULARIZE=1" -s "EXPORT_NAME=createGrokCache" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s DISABLE_EXCEPTION_CATCHING=0 -s NO_EXIT_RUNTIME=1 grokcache.cpp -o grokcache.js
