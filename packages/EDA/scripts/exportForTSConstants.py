""" exportConstants.py
Constants for C/C++-to-wasm export script.
"""

# export settings constants
NAME = 'name'
FOLDER = 'folder'
RUNTIME_SYSTEM = 'runtimeSystemFile'
RUNTIME_SYSTEM_FOR_WEBWORKER= 'runtimeSystemForWebWorker'
PACKAGE_FILE = 'packageFile'
OPTIMIZATION_MODE = 'optimizationMode'
TOTAL_MEMORY = 'totalMemory'
PACKAGE_JSON_FILE = 'packageJsonFile'
WORKERS_FOLDER = 'workers'

# constants for function specification
ARGUMENTS = 'arguments'
OUTPUT = 'output'
ANNOTATION = 'annotation'
PROTOTYPE = 'prototype'
CALL_ARGS = 'callArgs'
WW_PROTOTYPE = 'prototypeForWebWorker'
TYPE = 'type'
COLUMN = 'Column'
COLUMNS = 'Columns'
NUM = 'num'
DATA = 'data'
NEW = 'new'
NUM_OF_ROWS = 'numOfRows'
NUM_OF_COLUMNS = 'numOfColumns'
REF = 'ref'
VALUE = 'value'
SOURCE = 'source'
TABLE_FROM_COLUMNS = 'tableFromColumns'
OBJECTS = 'objects'

AUTOMATIC_GENERATION_LINE = '// The following code is generated automatically.'

# constants for processing code that is generated by Emscripten
EM_LIB_EXTENSION = '.js'
WW_FILE_SUFFIX = 'ForWebWorker'
NUM_OF_LINE_TO_MODIFY = 1
KEY_WORD_TO_ADD = 'export '
LINE_TO_REPLACE = 'fetch(wasmBinaryFile,{credentials:"same-origin"})' 

# constants for generating JS-code
CALL_WASM = 'callWasm'
WORKER_SUFFIX = 'Worker'
IN_WEBWORKER_SUFFIX = 'InWebWorker'
WORKER_EXTENSION = '.js'
CPP_WRAPPER_FUNCTION = 'cppWrapper'
GET_CPP_INPUT = 'getCppInput'
GET_RESULT = 'getResult'
WW_SPACE = ' ' * 2
WW_SUBSPACE = ' ' * 4
WW_SUBSUBSPACE = ' ' * 6
SPACE = ' ' * 2
SUBSPACE = ' ' * 4
SUBSUBSPACE = ' ' * 6
SUBSUBSUBSPACE = ' ' * 8
API_SUFFIX = 'API'
SERVICE_PREFFIX = '_'
ANY_TYPE = 'any'
OUTPUT_VARIABLE = '_output'
PROMISE_VARIABLE = '_promise'
RESULT_VARIBLABLE = '_result'
ERROR_VARIABLE = '_error'

# file operating constants
READ_MODE = 'r'
WRITE_MODE = 'w'
APPEND_MODE = 'a'

# annotation constants
ANNOT_INPUT = '//input:'
ANNOT_OUTPUT = '//output:'
ANNOT_NAME = '//name:'
ANNOT_NEW = 'new'
ANNOT_DATAFRAME = 'dataframe'
ANNOT_COLUMN = 'column'
ANNOT_COLUMN_LIST = 'column_list'
ANNOT_DOT = '.'
ANNOT_OBJECTS = 'objects'

# auxiliry maps 
sizesMap = {'rowCount': 'numOfRows', 'columnCount': 'numOfColumns', 'data': 'data'}
typesMap = {'int': 'number', 'double': 'number', 'column': 'DG.Column', 
            'column_list': 'DG.ColumnList', 'dataframe': 'DG.DataFrame'}

# Emscripten constants
EM_MACROS = 'EMSCRIPTEN_KEEPALIVE'

PJSN_SOURCES = 'sources'