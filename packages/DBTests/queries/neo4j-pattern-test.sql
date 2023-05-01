//name: Neo4jPatternsAll
//connection: Neo4jDBTests
//test: DBTests:expectTable(Neo4jPatternsAll(), OpenFile('System:AppData/DBTests/neo4j/data1-30.d42'))
MATCH(p:Person) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jIntTypePatternNone
//connection: Neo4jDBTests
//input: int id = 20
//test: DBTests:expectTable(Neo4jIntTypePatternNone(20), OpenFile('System:AppData/DBTests/postgresql/data20.d42'))
MATCH(p:Person) WHERE p.id = @id RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypeIntPatternOpMore
//connection: Neo4jDBTests
//input: string id = ">28" {pattern: int}
//test: DBTests:expectTable(Neo4jStringTypeIntPatternOpMore(), OpenFile('System:AppData/DBTests/postgresql/data29-30.d42'))
MATCH(p:Person) WHERE @id(p.id) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypeIntPatternOpMoreEq
//connection: Neo4jDBTests
//input: string id = ">=29" {pattern: int}
//test: DBTests:expectTable(Neo4jStringTypeIntPatternOpMoreEq(), OpenFile('System:AppData/DBTests/postgresql/data29-30.d42'))
MATCH(p:Person) WHERE @id(p.id) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypeIntPatternOpLessEq
//connection: Neo4jDBTests
//input: string id = "<=1" {pattern: int}
//test: DBTests:expectTable(Neo4jStringTypeIntPatternOpLessEq(), OpenFile('System:AppData/DBTests/postgresql/data1.d42'))
MATCH(p:Person) WHERE @id(p.id) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypeIntPatternOpLess
//connection: Neo4jDBTests
//input: string id = "<2" {pattern: int}
//test: DBTests:expectTable(Neo4jStringTypeIntPatternOpLess(), OpenFile('System:AppData/DBTests/postgresql/data1.d42'))
MATCH(p:Person) WHERE @id(p.id) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypeIntPatternOpIn
//connection: Neo4jDBTests
//input: string id = "in(29, 30)" {pattern: int}
//test: DBTests:expectTable(Neo4jStringTypeIntPatternOpIn(), OpenFile('System:AppData/DBTests/postgresql/data29-30.d42'))
MATCH(p:Person) WHERE @id(p.id) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypeIntPatternOpNotIn
//connection: Neo4jDBTests
//input: string id = "not in(21, 22, 23, 24, 25, 26, 27, 28, 29, 30)" {pattern: int}
//test: DBTests:expectTable(Neo4jStringTypeIntPatternOpNotIn(), OpenFile('System:AppData/DBTests/neo4j/data1-20.d42'))
MATCH(p:Person) WHERE @id(p.id) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypeIntPatternOpMinMax
//connection: Neo4jDBTests
//input: string id = "min-max 29-30" {pattern: int}
//test: DBTests:expectTable(Neo4jStringTypeIntPatternOpMinMax(), OpenFile('System:AppData/DBTests/postgresql/data29-30.d42'))
MATCH(p:Person) WHERE @id(p.id) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jDoubleTypePatternNone
//connection: Neo4jDBTests
//input: double some_number = 510.32
//test: DBTests:expectTable(Neo4jDoubleTypePatternNone(510.32), OpenFile('System:AppData/DBTests/postgresql/data1.d42'))
MATCH(p:Person) WHERE p.some_number = @some_number RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypePatternDoubleOpMore
//connection: Neo4jDBTests
//input: string some_number = ">975" {pattern: double}
//test: DBTests:expectTable(Neo4jStringTypePatternDoubleOpMore(), OpenFile('System:AppData/DBTests/postgresql/data10,26.d42'))
MATCH(p:Person) WHERE @some_number(p.some_number) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypePatternDoubleOpMoreEq
//connection: Neo4jDBTests
//input: string some_number = ">=975" {pattern: double}
//test: DBTests:expectTable(Neo4jStringTypePatternDoubleOpMoreEq(), OpenFile('System:AppData/DBTests/postgresql/data10,26.d42'))
MATCH(p:Person) WHERE @some_number(p.some_number) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypePatternDoubleOpLess
//connection: Neo4jDBTests
//input: string some_number = "<20" {pattern: double}
//test: DBTests:expectTable(Neo4jStringTypePatternDoubleOpLess(), OpenFile('System:AppData/DBTests/postgresql/data5.d42'))
MATCH(p:Person) WHERE @some_number(p.some_number) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypePatternDoubleOpLessEq
//connection: Neo4jDBTests
//input: string some_number = "<=20" {pattern: double}
//test: DBTests:expectTable(Neo4jStringTypePatternDoubleOpLessEq(), OpenFile('System:AppData/DBTests/postgresql/data5.d42'))
MATCH(p:Person) WHERE @some_number(p.some_number) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypePatternStringOpContains
//connection: Neo4jDBTests
//input: string first_name = "contains Z" {pattern: string}
//test: DBTests:expectTable(Neo4jStringTypePatternStringOpContains(first_name = 'contains Z'), OpenFile('System:AppData/DBTests/postgresql/data25.d42'))
MATCH(p:Person) WHERE @first_name(p.first_name) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypePatternStringOpStartsWith
//connection: Neo4jDBTests
//input: string first_name = "starts with W" {pattern: string}
//test: DBTests:expectTable(Neo4jStringTypePatternStringOpStartsWith(first_name='starts with W'), OpenFile('System:AppData/DBTests/postgresql/data23.d42'))
MATCH(p:Person) WHERE @first_name(p.first_name) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypePatternStringOpEndsWith
//connection: Neo4jDBTests
//input: string first_name = "ends with y" {pattern: string}
//test: DBTests:expectTable(Neo4jStringTypePatternStringOpEndsWith(first_name = 'ends with y'), OpenFile('System:AppData/DBTests/postgresql/data6,23,25.d42'))
MATCH(p:Person) WHERE @first_name(p.first_name) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypePatternStringOpIn
//connection: Neo4jDBTests
//input: string country = "in (Poland, Brazil)" {pattern: string}
//test: DBTests:expectTable(Neo4jStringTypePatternStringOpIn(), OpenFile('System:AppData/DBTests/postgresql/data2,5,20.d42'))
MATCH(p:Person) WHERE @country(p.country) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jStringTypePatternStringOpRegex
//connection: Neo4jDBTests
//input: string email = "regex ^([A-Za-z0-9_]+@google.com.au)$" {pattern: string}
//test: DBTests:expectTable(Neo4jStringTypePatternStringOpRegex(email = 'regex ^([A-Za-z0-9_]+@google.com.au)$'), OpenFile('System:AppData/DBTests/postgresql/data9.d42'))
MATCH(p:Person) WHERE @email(p.email) RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end

//name: Neo4jPatternsAllParams
//connection: Neo4jDBTests
//input: string first_name = "starts with p" {pattern: string}
//input: string id = ">1" {pattern :int}
//input: bool bool = false
//input: string email = "contains com" {pattern: string}
//input: string some_number = ">20" {pattern: double}
//input: string country = "in (Indonesia)" {pattern: string}
//input: string date = "before 1/1/2022" {pattern: datetime}
//test: DBTests:expectTable(Neo4jPatternsAllParams(first_name = "starts with p", id = ">1", false, email = "contains com", some_number = ">20", country = "in (Indonesia)", date = "before 1/1/2022"), OpenFile("System:AppData/DBTests/postgresql/data13.d42"))
MATCH(p:Person) WHERE @first_name(p.first_name) AND @id(p.id) AND p.bool = @bool AND @email(p.email)
    AND @some_number(p.some_number) AND @country(p.country) AND @date(p.date)
    RETURN p.id AS id, p.first_name AS first_name,
    p.last_name AS last_name, p.email AS email, p.gender AS gender, p.ip_address AS ip_address,
    p.bool AS bool, p.country AS country, p.date AS date, p.some_number AS some_number;
//end