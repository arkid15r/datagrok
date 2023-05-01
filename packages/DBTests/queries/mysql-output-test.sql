-- name: MySqlDateTypes
-- connection: MySqlDBTests
-- test: DBTests:expectTable(MySqlDateTypes(), OpenFile('System:AppData/DBTests/mysql/mysql_output_dates.d42'))
SELECT * FROM DATE_TYPES;
-- end

-- name: MySqlBinaryTypes
-- connection: MySqlDBTests
-- test: DBTests:expectTable(MySqlBinaryTypes(), OpenFile('System:AppData/DBTests/mysql/mysql_output_binary.d42'))
SELECT CAST(binary_type as CHAR(5)) as binary_type, CAST(varbinary_type AS CHAR(8))
    as varbinary_type FROM BINARY_TYPES;
-- end

-- name: MySqlBitType
-- connection: MySqlDBTests
-- test: DBTests:expectTable(MySqlBitType(), OpenFile('System:AppData/DBTests/mysql/mysql_output_bit.d42'))
SELECT BIN(bit_type1) AS bit_type1, bit_type2 FROM BIT_TYPE;
-- end

-- name: MySqlCharacterTypes
-- connection: MySqlDBTests
-- test: DBTests:expectTable(MySqlCharacterTypes(), OpenFile('System:AppData/DBTests/mysql/mysql_output_characters.d42'))
SELECT * FROM CHARACTER_TYPES;
-- end

-- name: MySqlFloatTypes
-- connection: MySqlDBTests
-- test: DBTests:expectTable(MySqlFloatTypes(), OpenFile('System:AppData/DBTests/mysql/mysql_output_floats.d42'))
SELECT * FROM FLOAT_TYPES;
-- end

-- name: MySqlJsonType
-- connection: MySqlDBTests
-- test: DBTests:expectTable(MySqlJsonType(), OpenFile('System:AppData/DBTests/mysql/mysql_output_json.d42'))
SELECT * FROM JSON_TYPE;
-- end

-- name: MySqlIntegerTypes
-- connection: MySqlDBTests
-- test: DBTests:expectTable(MySqlIntegerTypes(), OpenFile('System:AppData/DBTests/mysql/mysql_output_integers.d42'))
SELECT * FROM INTEGER_TYPES;
-- end

-- name: MySqlSpatialTypes
-- connection: MySqlDBTests
-- test: DBTests:expectTable(MySqlSpatialTypes(), OpenFile('System:AppData/DBTests/mysql/mysql_output_spatial.d42'))
SELECT ST_AsText(geometry_type) AS geometry_type, ST_AsText(point_type) AS point_type FROM GEOMETRY_TYPE;
-- end