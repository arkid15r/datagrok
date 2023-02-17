package grok_connect.providers;

import grok_connect.connectors_info.FuncCall;
import grok_connect.providers.utils.DataFrameComparator;
import grok_connect.providers.utils.Providers;
import grok_connect.providers.utils.Sql;
import grok_connect.providers.utils.SqlScriptRunner;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import serialization.DataFrame;

/**
 * Test class for PostgresDataProvider
 */
@ExtendWith(SqlScriptRunner.class)
class PostgresDataProviderTest extends ProviderBaseTest {
    private static final String INIT_SCHEMA_NAME = "public";
    private static final String INIT_TABLE_NAME = "mock_data";
    private final DataFrameComparator dataFrameComparator;

    protected PostgresDataProviderTest() {
        super(Providers.POSTGRESQL);
        dataFrameComparator = new DataFrameComparator();
    }

    @DisplayName("Test of getSchemas() method with correct DataConnection")
    @ParameterizedTest(name = "CORRECT ARGUMENTS")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#getSchemas_ok")
    @Sql(path = "scripts/postgres/postgres_basic_types.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void getSchemas_ok(DataFrame expected) {
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.getSchemas(connection));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @Disabled
    @Test
    public void getSchemas_notOk() {
        // method probably should throw something when bad input
    }

    @DisplayName("Test of getSchema() method with correct DataConnection")
    @ParameterizedTest(name = "CORRECT ARGUMENTS")
    @Sql(path = "scripts/postgres/postgres_basic_types.sql",
            restorePath = "scripts/postgres/drop.sql")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#getSchema_ok")
    public void getSchema_ok(DataFrame expected) {
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.getSchema(connection,
                INIT_SCHEMA_NAME, INIT_TABLE_NAME));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @Disabled
    @Test
    public void getSchema_notOk() {
        // method probably should throw something when bad input
    }

    @DisplayName("Output support for postgresql array type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_arrayType_ok")
    @Sql(path = "scripts/postgres/postgres_array.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_arrayType_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for postgresql basic types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_basicTypes_ok")
    @Sql(path = "scripts/postgres/postgres_basic_types.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_basicTypes_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for postgresql bit string type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_bitStringType_ok")
    @Sql(path = "scripts/postgres/postgres_bit_string.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_bitStringType_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

// bytea types - incorrect mapping - string repr of memory location id, not bytes
    @DisplayName("Output support for postgresql bytea type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_byteAType_ok")
    @Sql(path = "scripts/postgres/postgres_bytea.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_byteAType_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for postgresql composite custom type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_compositeType_ok")
    @Sql(path = "scripts/postgres/postgres_composite.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_compositeType_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for postgresql date, time, timestamp, interval types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_dateTypes_ok")
    @Sql(path = "scripts/postgres/postgres_dates.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_dateTypes_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for postgresql jsonb")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_jsonbType_ok")
    @Sql(path = "scripts/postgres/postgres_jsonb.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_jsonbType_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    //incorrect results for numeric NaN - exception, numeric with only precision - lost of data after floating point
    //
    @DisplayName("Output support for postgresql numeric, real, double precision, bigint")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_numericType_ok")
    @Sql(path = "scripts/postgres/postgres_numeric.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_numericType_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for serial type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_serialType_ok")
    @Sql(path = "scripts/postgres/postgres_serial.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_serialType_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for uuid type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_uuidType_ok")
    @Sql(path = "scripts/postgres/postgres_uuid.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_uuidType_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    // xml type is not supported, output as memory location (e.g. default toString())
    @DisplayName("Output support for xml type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkOutputDataFrame_xmlType_ok")
    @Sql(path = "scripts/postgres/postgres_xml.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkOutputDataFrame_xmlType_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    // Parameter support
    // not in and regex are not supported
    @DisplayName("Parameters support")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkParameterSupport_ok")
    @Sql(path = "scripts/postgres/postgres_basic_types.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkParameterSupport_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    // this week - incorrect request comes from browser
    @DisplayName("Parameters support for datetime")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.utils.ObjectsMother#checkDatesParameterSupport_ok")
    @Sql(path = "scripts/postgres/postgres_dates_patterns.sql",
            restorePath = "scripts/postgres/drop.sql")
    public void checkDatesParameterSupport_ok(FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }
}