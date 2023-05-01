--name: PostgresqlPatternsAll
--connection: PostgreSQLDBTests
--test: DBTests:expectTable(PostgresqlPatternsAll(), OpenFile('System:AppData/DBTests/postgresql/data1-30.d42'))
SELECT * FROM mock_data
--end

--name: PostgresqlIntTypePatternNone
--connection: PostgreSQLDBTests
--input: int id = 20
--test: DBTests:expectTable(PostgresqlIntTypePatternNone(20), OpenFile('System:AppData/DBTests/postgresql/data20.d42'))
SELECT * FROM mock_data WHERE id = @id;
--end

--name: PostgresqlStringTypeIntPatternOpMore
--connection: PostgreSQLDBTests
--input: string id = ">28" {pattern: int}
--test: DBTests:expectTable(PostgresqlStringTypeIntPatternOpMore(), OpenFile('System:AppData/DBTests/postgresql/data29-30.d42'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpMoreEq
--connection: PostgreSQLDBTests
--input: string id = ">=29" {pattern: int}
--test: DBTests:expectTable(PostgresqlStringTypeIntPatternOpMoreEq(), OpenFile('System:AppData/DBTests/postgresql/data29-30.d42'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpLessEq
--connection: PostgreSQLDBTests
--input: string id = "<=1" {pattern: int}
--test: DBTests:expectTable(PostgresqlStringTypeIntPatternOpLessEq(), OpenFile('System:AppData/DBTests/postgresql/data1.d42'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpLess
--connection: PostgreSQLDBTests
--input: string id = "<2" {pattern: int}
--test: DBTests:expectTable(PostgresqlStringTypeIntPatternOpLess(), OpenFile('System:AppData/DBTests/postgresql/data1.d42'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpIn
--connection: PostgreSQLDBTests
--input: string id = "in(29, 30)" {pattern: int}
--test: DBTests:expectTable(PostgresqlStringTypeIntPatternOpIn(), OpenFile('System:AppData/DBTests/postgresql/data29-30.d42'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpNotIn
--connection: PostgreSQLDBTests
--input: string id = "not in(21, 22, 23, 24, 25, 26, 27, 28, 29, 30)" {pattern: int}
--test: DBTests:expectTable(PostgresqlStringTypeIntPatternOpNotIn(), OpenFile('System:AppData/DBTests/postgresql/data1-20.d42'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpMinMax
--connection: PostgreSQLDBTests
--input: string id = "min-max 29-30" {pattern: int}
--test: DBTests:expectTable(PostgresqlStringTypeIntPatternOpMinMax(), OpenFile('System:AppData/DBTests/postgresql/data29-30.d42'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpNotEq
--connection: PostgreSQLDBTests
--input: string id = "!=1" {pattern: int}
--test: DBTests:expectTable(PostgresqlStringTypeIntPatternOpNotEq(), OpenFile('System:AppData/DBTests/postgresql/data2-30.d42'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlDoubleTypePatternNone
--connection: PostgreSQLDBTests
--input: double some_number = 510.32
--test: DBTests:expectTable(PostgresqlDoubleTypePatternNone(510.32), OpenFile('System:AppData/DBTests/postgresql/data1.d42'))
SELECT * FROM mock_data WHERE some_number = @some_number;
--end

--name: PostgresqlStringTypePatternDoubleOpMore
--connection: PostgreSQLDBTests
--input: string some_number = ">975" {pattern: double}
--test: DBTests:expectTable(PostgresqlStringTypePatternDoubleOpMore(), OpenFile('System:AppData/DBTests/postgresql/data10,26.d42'))
SELECT * FROM mock_data WHERE @some_number(some_number);
--end

--name: PostgresqlStringTypePatternDoubleOpMoreEq
--connection: PostgreSQLDBTests
--input: string some_number = ">=975" {pattern: double}
--test: DBTests:expectTable(PostgresqlStringTypePatternDoubleOpMoreEq(), OpenFile('System:AppData/DBTests/postgresql/data10,26.d42'))
SELECT * FROM mock_data WHERE @some_number(some_number);
--end

--name: PostgresqlStringTypePatternDoubleOpLess
--connection: PostgreSQLDBTests
--input: string some_number = "<20" {pattern: double}
--test: DBTests:expectTable(PostgresqlStringTypePatternDoubleOpLess(), OpenFile('System:AppData/DBTests/postgresql/data5.d42'))
SELECT * FROM mock_data WHERE @some_number(some_number);
--end

--name: PostgresqlStringTypePatternDoubleOpLessEq
--connection: PostgreSQLDBTests
--input: string some_number = "<=20" {pattern: double}
--test: DBTests:expectTable(PostgresqlStringTypePatternDoubleOpLessEq(), OpenFile('System:AppData/DBTests/postgresql/data5.d42'))
SELECT * FROM mock_data WHERE @some_number(some_number);
--end

--name: PostgresqlStringTypePatternStringOpContains
--connection: PostgreSQLDBTests
--input: string first_name = "contains Z" {pattern: string}
--test: DBTests:expectTable(PostgresqlStringTypePatternStringOpContains(first_name = 'contains Z'), OpenFile('System:AppData/DBTests/postgresql/data25.d42'))
SELECT * FROM mock_data WHERE @first_name(first_name);
--end

--name: PostgresqlStringTypePatternStringOpStartsWith
--connection: PostgreSQLDBTests
--input: string first_name = "starts with W" {pattern: string}
--test: DBTests:expectTable(PostgresqlStringTypePatternStringOpStartsWith(first_name='starts with W'), OpenFile('System:AppData/DBTests/postgresql/data23.d42'))
SELECT * FROM mock_data WHERE @first_name(first_name);
--end

--name: PostgresqlStringTypePatternStringOpEndsWith
--connection: PostgreSQLDBTests
--input: string first_name = "ends with y" {pattern: string}
--test: DBTests:expectTable(PostgresqlStringTypePatternStringOpEndsWith(first_name = 'ends with y'), OpenFile('System:AppData/DBTests/postgresql/data6,23,25.d42'))
SELECT * FROM mock_data WHERE @first_name(first_name);
--end

--name: PostgresqlStringTypePatternStringOpIn
--connection: PostgreSQLDBTests
--input: string country = "in (Poland, Brazil)" {pattern: string}
--test: DBTests:expectTable(PostgresqlStringTypePatternStringOpIn(), OpenFile('System:AppData/DBTests/postgresql/data2,5,20.d42'))
SELECT * FROM mock_data WHERE @country(country);
--end

--name: PostgresqlStringTypePatternStringOpRegex
--connection: PostgreSQLDBTests
--input: string email = "regex ^([A-Za-z0-9_]+@google.com.au)$" {pattern: string}
--test: DBTests:expectTable(PostgresqlStringTypePatternStringOpRegex(email = 'regex ^([A-Za-z0-9_]+@google.com.au)$'), OpenFile('System:AppData/DBTests/postgresql/data9.d42'))
SELECT * FROM mock_data WHERE @email(email);
--end

--name: PostgresqlPatternsAllParams
--connection: PostgreSQLDBTests
--input: string first_name = "starts with p" {pattern: string}
--input: string id = ">1" {pattern :int}
--input: bool bool = false
--input: string email = "contains com" {pattern: string}
--input: string some_number = ">20" {pattern: double}
--input: string country = "in (Indonesia)" {pattern: string}
--input: string date = "before 1/1/2022" {pattern: datetime}
--test: DBTests:expectTable(PostgresqlPatternsAllParams(first_name = "starts with p", id = ">1", false, email = "contains com", some_number = ">20", country = "in (Indonesia)", date = "before 1/1/2022"), OpenFile("System:AppData/DBTests/postgresql/data13.d42"))
SELECT * FROM mock_data
WHERE @first_name(first_name)
  AND @id(id)
           AND bool = @bool
           AND @email(email)
           AND @some_number(some_number)
           AND @country(country)
           AND @date(date);
--end