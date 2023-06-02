package grok_connect.providers;

import java.sql.Array;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataQuery;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncParam;
import grok_connect.table_query.AggrFunctionInfo;
import grok_connect.table_query.Stats;
import grok_connect.utils.Property;
import grok_connect.utils.ProviderManager;
import oracle.jdbc.OracleResultSet;
import oracle.sql.TIMESTAMPTZ;
import oracle.sql.ZONEIDMAP;
import oracle.sql.json.OracleJsonObject;
import serialization.Types;

public class OracleDataProvider extends JdbcDataProvider {
    private static final String SYS_SCHEMAS_FILTER =
            "COL.OWNER != 'SYSTEM' AND COL.OWNER != 'CTXSYS' AND COL.OWNER != 'MDSYS' " +
            "AND COL.OWNER != 'XDB' AND COL.OWNER != 'APEX_040000' AND COL.OWNER != 'SYS' " +
            "AND COL.OWNER != 'WMSYS' AND COL.OWNER != 'EXFSYS' AND COL.OWNER != 'ORDSYS' " +
            "AND COL.OWNER != 'ORDDATA'";
    private static final byte REGIONIDBIT = (byte) 0b1000_0000;

    public OracleDataProvider(ProviderManager providerManager) {
        super(providerManager);
        driverClassName = "oracle.jdbc.OracleDriver";

        descriptor = new DataSource();
        descriptor.type = "Oracle";
        descriptor.description = "Query Oracle database";
        descriptor.connectionTemplate = new ArrayList<>(DbCredentials.dbConnectionTemplate);
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.canBrowseSchema = true;
        descriptor.nameBrackets = "\"";

        descriptor.typesMap = new HashMap<String, String>() {{
            put("long", Types.INT);
            put("float", Types.FLOAT);
            put("#number\\([1-9], 0\\)", Types.INT);
            put("#number\\((3[0-8]|[1-2][0-9]), 0\\)", Types.BIG_INT);
            put("#number\\((3[0-8]|[1-2][0-9]|[1-9]), -?[^0]+\\)", Types.FLOAT);
            put("binary_float", Types.FLOAT);
            put("binary_double", Types.FLOAT);
            put("#.*char.*", Types.STRING);
            put("#.*varchar.*", Types.STRING);
            put("date", Types.DATE_TIME);
            put("#timestamp.*", Types.DATE_TIME);
            put("#interval.*", Types.DATE_TIME);
            put("json", Types.OBJECT);
            put("#.*clob.*", Types.BLOB);
            put("blob", Types.BLOB);
            put("uritype", Types.OBJECT);
            put("mem_type", Types.OBJECT);
            put("xmltype", Types.OBJECT);
        }};
        descriptor.aggregations.add(new AggrFunctionInfo(Stats.STDEV, "stddev(#)", Types.dataFrameNumericTypes));
        descriptor.aggregations.add(new AggrFunctionInfo(Stats.STDEV, "median(#)", Types.dataFrameNumericTypes));
    }

    @Override
    public void prepareProvider() throws ClassNotFoundException {
        super.prepareProvider();
        System.getProperties().setProperty("oracle.jdbc.J2EE13Compliant", "true");
    }

    @Override
    protected boolean isInteger(int type, String typeName, int precision, int scale) {
        // https://docs.oracle.com/cd/E11882_01/server.112/e41084/sql_elements001.htm#sthref119
        // The absence of precision and scale designators specifies the maximum range and precision for an Oracle number.
        // We shall ignore the case where type == java.sql.Types. ... value is identified incorrectly
        if (isOracleFloatNumber(typeName, precision, scale)) return false;
        return typeName.equalsIgnoreCase("number") && precision < 10 && scale == 0;
    }

    @Override
    protected boolean isFloat(int type, String typeName, int precision, int scale) {
        return super.isFloat(type, typeName, precision, scale) || isOracleFloatNumber(typeName, precision, scale);
    }

    @Override
    protected boolean isDecimal(int type, String typeName, int scale) {
        return typeName.equalsIgnoreCase("number") && scale > 0;
    }

    @Override
    protected boolean isBigInt(int type, String typeName, int precision, int scale) {
        return typeName.equalsIgnoreCase("number") && precision > 10 && scale == 0;
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("REGEXP_LIKE (%s, '%s', 'i')", columnName, regexExpression);
    }

    @Override
    public OffsetDateTime timestamptzToOffsetDateTime(TIMESTAMPTZ dbData) {
        if (dbData == null) {
            return null;
        }
        byte[] bytes = dbData.toBytes();
        OffsetDateTime utc = extractUtc(bytes);
        if (isFixedOffset(bytes)) {
            ZoneOffset offset = extractOffset(bytes);
            return utc.withOffsetSameInstant(offset);
        }
        ZoneId zoneId = extractZoneId(bytes);
        return utc.atZoneSameInstant(zoneId).toOffsetDateTime();
    }

    @Override
    protected boolean isArray(int type, String typeName) {
        return type == 2003 || typeName.equalsIgnoreCase("ARRAY");
    }

    @Override
    protected Object convertArrayType(Object value) {
        if (value == null) {
            return Arrays.toString(new String[]{});
        }
        Array sqlArray = ((Array) value);
        try {
            Object[] array = (Object[]) sqlArray.getArray();
            return Arrays.toString(array);
        } catch (SQLException e) {
            throw new RuntimeException("Something went wrong when converting VARRAY type of Oracle");
        }
    }

    @Override
    protected Object getObjectFromResultSet(ResultSet resultSet, int c) {
        try {
            if (resultSet.getMetaData().getColumnTypeName(c).equals("JSON")) {
                return resultSet.unwrap(OracleResultSet.class).getObject(c, OracleJsonObject.class);
            }
            return resultSet.getObject(c);
        } catch (SQLException e) {
            throw new RuntimeException("Something went wrong when getting object from result set");
        }
    }

    @Override
    protected void appendQueryParam(DataQuery dataQuery, String paramName, StringBuilder queryBuffer) {
        FuncParam param = dataQuery.getParam(paramName);
        if (param.propertyType.equals("list")) {
            @SuppressWarnings("unchecked")
            List<String> values = ((ArrayList<String>) param.value);
            queryBuffer.append(values.stream().map(value -> "?").collect(Collectors.joining(", ")));
        } else {
            queryBuffer.append("?");
        }
    }

    @Override
    protected int setArrayParamValue(PreparedStatement statement, int n, FuncParam param) throws SQLException {
        @SuppressWarnings (value="unchecked")
        ArrayList<Object> lst = (ArrayList<Object>)param.value;
        if (lst == null || lst.size() == 0) {
            statement.setObject(n, null);
            return 0;
        }
        for (int i = 0; i < lst.size(); i++) {
            statement.setObject(n + i, lst.get(i));
        }
        return lst.size() - 1;
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        conn.getPort();
        return "jdbc:oracle:thin:@(DESCRIPTION=" +
                "(ADDRESS=" +
                    "(PROTOCOL=" + (conn.ssl() ? "tcps" : "tcp") + ")" +
                    "(HOST=" + conn.getServer() + ")" +
                    "(PORT=" + conn.getPort() + "))" +
                "(CONNECT_DATA=(SERVICE_NAME=" + conn.getDb() + ")))";
    }

    @Override
    public String getSchemasSql(String db) {
        return "SELECT COL.OWNER as TABLE_SCHEMA FROM ALL_TAB_COLUMNS COL WHERE " + SYS_SCHEMAS_FILTER +
                " GROUP BY COL.OWNER ORDER BY COL.OWNER";
    }

    @Override
    public String getSchemaSql(String db, String schema, String table) {
        String whereClause = "WHERE " + SYS_SCHEMAS_FILTER;

        if (table != null)
            whereClause = whereClause + " AND (COL.TABLE_NAME = '" + table + "')";
        if (schema != null)
            whereClause = whereClause + " AND (COL.OWNER = '" + schema + "')";

        return "SELECT COL.OWNER as TABLE_SCHEMA, COL.TABLE_NAME AS TABLE_NAME, COL.COLUMN_NAME AS COLUMN_NAME, " +
                "CASE WHEN DATA_PRECISION IS NOT NULL AND DATA_SCALE IS NOT NULL " +
                "THEN CONCAT(COL.DATA_TYPE, CONCAT(CONCAT(CONCAT(CONCAT('(', DATA_PRECISION), ', '), DATA_SCALE), ')')) ELSE COL.DATA_TYPE END AS DATA_TYPE, " +
                "CASE WHEN O.OBJECT_TYPE = 'VIEW' THEN 1 ELSE 0 END AS IS_VIEW" +
                " FROM ALL_TAB_COLUMNS COL INNER JOIN ALL_OBJECTS O ON O.OBJECT_NAME = COL.TABLE_NAME " + whereClause +
                " ORDER BY TABLE_NAME";
    }

    public String limitToSql(String query, Integer limit) {
        return "select * from (\n" + query + "\n) where ROWNUM <= " + limit.toString();
    }

    public String addBrackets(String name) {
        String brackets = descriptor.nameBrackets;
        return name.startsWith(brackets.substring(0, 1)) ? name :
                brackets.charAt(0) + name + brackets.substring(brackets.length() - 1);
    }

    private boolean isOracleFloatNumber(String typeName, int precision, int scale) {
        // https://markhoxey.wordpress.com/2016/05/31/maximum-number-precision/ ==>  Precision >= 38
        // https://stackoverflow.com/questions/29537292/why-can-number-type-in-oracle-scale-up-to-127 ==> scale >= 127
        return typeName.equalsIgnoreCase("number") && (scale == 0 || scale >= 127) && (precision < 0);
    }

    private static OffsetDateTime extractUtc(byte[] bytes) {
        return OffsetDateTime.of(extractLocalDateTime(bytes), ZoneOffset.UTC);
    }

    private static boolean isFixedOffset(byte[] bytes) {
        return (bytes[11] & REGIONIDBIT) == 0;
    }

    private static ZoneOffset extractOffset(byte[] bytes) {
        int hours = bytes[11] - 20;
        int minutes = bytes[12] - 60;
        if ((hours == 0) && (minutes == 0)) {
            return ZoneOffset.UTC;
        }
        return ZoneOffset.ofHoursMinutes(hours, minutes);
    }

    private static ZoneId extractZoneId(byte[] bytes) {
        // high order bits
        int regionCode = (bytes[11] & 0b1111111) << 6;
        // low order bits
        regionCode += (bytes[12] & 0b11111100) >> 2;
        String regionName = ZONEIDMAP.getRegion(regionCode);
        return ZoneId.of(regionName);
    }

    private static LocalDateTime extractLocalDateTime(byte[] bytes) {
        int year = ((Byte.toUnsignedInt(bytes[0]) - 100) * 100) + (Byte.toUnsignedInt(bytes[1]) - 100);
        int month = bytes[2];
        int dayOfMonth = bytes[3];
        int hour = bytes[4] - 1;
        int minute = bytes[5] - 1;
        int second = bytes[6] - 1;
        int nanoOfSecond = (Byte.toUnsignedInt(bytes[7]) << 24)
                | (Byte.toUnsignedInt(bytes[8]) << 16)
                | (Byte.toUnsignedInt(bytes[9]) << 8)
                | Byte.toUnsignedInt(bytes[10]);
        return LocalDateTime.of(year, month, dayOfMonth, hour, minute, second, nanoOfSecond);
    }
}
