--name: PostgresqlPatternsAll
--connection: PostgreSQLApiTests
--test: ApiTests:expectTable(PostgresqlPatternsAll(), OpenFile('System:AppData/ApiTests/datasets/tests/data1-30.csv'))
SELECT * FROM mock_data;
--end

-- INT PATTERN

--name: PostgresqlIntTypePatternNone
--connection: PostgreSQLApiTests
--input: int id = 20
--test: ApiTests:expectTable(PostgresqlIntTypePatternNone(), OpenFile('System:AppData/ApiTests/datasets/tests/data20.csv'))
SELECT * FROM mock_data WHERE id = @id;
--end

--name: PostgresqlStringTypeIntPatternOpMore
--connection: PostgreSQLApiTests
--input: string id = ">28" {pattern: int}
--test: ApiTests:expectTable(PostgresqlStringTypeIntPatternOpMore(), OpenFile('System:AppData/ApiTests/datasets/tests/data29-30.csv'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpMoreEq
--connection: PostgreSQLApiTests
--input: string id = ">=29" {pattern: int}
--test: ApiTests:expectTable(PostgresqlStringTypeIntPatternOpMoreEq(), OpenFile('System:AppData/ApiTests/datasets/tests/data29-30.csv'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpLessEq
--connection: PostgreSQLApiTests
--input: string id = "<=1" {pattern: int}
--test: ApiTests:expectTable(PostgresqlStringTypeIntPatternOpLessEq(), OpenFile('System:AppData/ApiTests/datasets/tests/data1.csv'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpLess
--connection: PostgreSQLApiTests
--input: string id = "<2" {pattern: int}
--test: ApiTests:expectTable(PostgresqlStringTypeIntPatternOpLess(), OpenFile('System:AppData/ApiTests/datasets/tests/data1.csv'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpIn
--connection: PostgreSQLApiTests
--input: string id = "in(29, 30)" {pattern: int}
--test: ApiTests:expectTable(PostgresqlStringTypeIntPatternOpIn(), OpenFile('System:AppData/ApiTests/datasets/tests/data29-30.d42'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpNotIn
--connection: PostgreSQLApiTests
--input: string id = "not in(21, 22, 23, 24, 25, 26, 27, 28, 29, 30)" {pattern: int}
--test: ApiTests:expectTable(PostgresqlStringTypeIntPatternOpNotIn(), OpenFile('System:AppData/ApiTests/datasets/tests/data1-20.csv'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpMinMax
--connection: PostgreSQLApiTests
--input: string id = "min-max 29-30" {pattern: int}
--test: ApiTests:expectTable(PostgresqlStringTypeIntPatternOpMinMax(), OpenFile('System:AppData/ApiTests/datasets/tests/data29-30.csv'))
SELECT * FROM mock_data WHERE @id(id)
--end

--name: PostgresqlStringTypeIntPatternOpNotEq
--connection: PostgreSQLApiTests
--input: string id = "!=1" {pattern: int}
--test: ApiTests:expectTable(PostgresqlStringTypeIntPatternOpNotEq(), OpenFile('System:AppData/ApiTests/datasets/tests/data2-30.csv'))
SELECT * FROM mock_data WHERE @id(id)
--end


--DOUBLE PATTERN

--name: PostgresqlDoubleTypePatternNone
--connection: PostgreSQLApiTests
--input: double some_number = 510.32
--test: ApiTests:expectTable(PostgresqlDoubleTypePatternNone(), OpenFile('System:AppData/ApiTests/datasets/tests/data1.csv'))
SELECT * FROM mock_data WHERE some_number = @some_number;
--end

--name: PostgresqlStringTypePatternDoubleOpMore
--connection: PostgreSQLApiTests
--input: string some_number = ">975" {pattern: double}
--test: ApiTests:expectTable(PostgresqlStringTypePatternDoubleOpMore(), OpenFile('System:AppData/ApiTests/datasets/tests/data10,26.csv'))
SELECT * FROM mock_data WHERE @some_number(some_number);
--end

--name: PostgresqlStringTypePatternDoubleOpMoreEq
--connection: PostgreSQLApiTests
--input: string some_number = ">=975" {pattern: double}
--test: ApiTests:expectTable(PostgresqlStringTypePatternDoubleOpMoreEq(), OpenFile('System:AppData/ApiTests/datasets/tests/data10,26.csv'))
SELECT * FROM mock_data WHERE @some_number(some_number);
--end

--name: PostgresqlStringTypePatternDoubleOpLess
--connection: PostgreSQLApiTests
--input: string some_number = "<20" {pattern: double}
--test: ApiTests:expectTable(PostgresqlStringTypePatternDoubleOpLess(), OpenFile('System:AppData/ApiTests/datasets/tests/data5.csv'))
SELECT * FROM mock_data WHERE @some_number(some_number);
--end

--name: PostgresqlStringTypePatternDoubleOpLessEq
--connection: PostgreSQLApiTests
--input: string some_number = "<=20" {pattern: double}
--test: ApiTests:expectTable(PostgresqlStringTypePatternDoubleOpLessEq(), OpenFile('System:AppData/ApiTests/datasets/tests/data5.csv'))
SELECT * FROM mock_data WHERE @some_number(some_number);
--end

--CHOICES - should be used for end-to-end tests

--name: PostgresqlByStringChoices
--input: string country = "France" {choices: ["France", "China", "USA", "Finland"]}
SELECT * FROM mock_data WHERE country = @country;
--end

--name: PostgresqlByStringChoices
--input: string country = "France" {choices: Query("SELECT DISTINCT country FROM mock_data")}
SELECT * FROM mock_data WHERE country = @country;
--end

--STRING PATTERN

--name: PostgresqlStringTypePatternStringOpContains
--connection: PostgreSQLApiTests
--input: string first_name = "contains Z" {pattern: string}
--test: ApiTests:expectTable(PostgresqlStringTypePatternStringOpContains(), OpenFile('System:AppData/ApiTests/datasets/tests/data25.csv'))
SELECT * FROM mock_data WHERE @first_name(first_name);
--end

--name: PostgresqlStringTypePatternStringOpStartsWith
--connection: PostgreSQLApiTests
--input: string first_name = "starts with W" {pattern: string}
--test: ApiTests:expectTable(PostgresqlStringTypePatternStringOpStartsWith(), OpenFile('System:AppData/ApiTests/datasets/tests/data23.csv'))
SELECT * FROM mock_data WHERE @first_name(first_name);
--end

--name: PostgresqlStringTypePatternStringOpEndsWith
--connection: PostgreSQLApiTests
--input: string first_name = "ends with y" {pattern: string}
--test: ApiTests:expectTable(PostgresqlStringTypePatternStringOpEndsWith(), OpenFile('System:AppData/ApiTests/datasets/tests/data6,23,25.csv'))
SELECT * FROM mock_data WHERE @first_name(first_name);
--end

--name: PostgresqlStringTypePatternStringOpIn
--connection: PostgreSQLApiTests
--input: string country = "in (Poland, Brazil)" {pattern: string}
--test: ApiTests:expectTable(PostgresqlStringTypePatternStringOpIn(), OpenFile('System:AppData/ApiTests/datasets/tests/data2,5,20.csv'))
SELECT * FROM mock_data WHERE @country(country);
--end

--name: PostgresqlStringTypePatternStringOpRegex
--connection: PostgreSQLApiTests
--input: string email = "regex ^([A-Za-z0-9_]+@google.com.au)$" {pattern: string}
--test: ApiTests:expectTable(PostgresqlStringTypePatternStringOpRegex(), OpenFile('System:AppData/ApiTests/datasets/tests/data9.csv'))
SELECT * FROM mock_data WHERE @email(email);
--end

--name: PostgresqlPatternsAllParams
--connection: PostgreSQLApiTests
--input: string first_name = "starts with p" {pattern: string}
--input: string id = ">1" {pattern :int}
--input: string tableName {escape: false}
--input: bool bool = false
--input: string email = "contains com" {pattern: string}
--input: string some_number = ">20" {pattern: double}
--input: string country = "in (Indonesia)" {pattern: string}
--input: string date = "before 1/1/2022" {pattern: datetime}
--test: ApiTests:expectTable(PostgresqlPatternsAllParams(), OpenFile("System:AppData/ApiTests/datasets/tests/data13.csv"))
SELECT * FROM mock_data
WHERE @first_name(first_name)
  AND @id(id)
           AND bool = @bool
           AND @email(email)
           AND @some_number(some_number)
           AND @country(country)
           AND @date(date)
           AND s = '@' || 'a';

--end