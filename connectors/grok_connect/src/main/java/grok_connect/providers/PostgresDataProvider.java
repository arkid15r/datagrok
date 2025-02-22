package grok_connect.providers;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Properties;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.table_query.AggrFunctionInfo;
import grok_connect.table_query.Stats;
import grok_connect.utils.Property;
import grok_connect.utils.ProviderManager;
import serialization.Types;

public class PostgresDataProvider extends JdbcDataProvider {
    public PostgresDataProvider(ProviderManager providerManager) {
        super(providerManager);
        driverClassName = "org.postgresql.Driver";

        descriptor = new DataSource();
        descriptor.type = "Postgres";
        descriptor.description = "Query Postgres database";
        descriptor.connectionTemplate = new ArrayList<>(DbCredentials.dbConnectionTemplate);
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.nameBrackets = "\"";

        descriptor.canBrowseSchema = true;
        descriptor.defaultSchema = "public";
        descriptor.typesMap = new HashMap<String, String>() {{
            put("smallint", Types.INT);
            put("int", Types.INT);
            put("integer", Types.INT);
            put("bigint", Types.BIG_INT);
            put("real", Types.FLOAT);
            put("double precision", Types.FLOAT);
            put("numeric", Types.FLOAT);
            put("#character.*", Types.STRING);
            put("#varchar.*", Types.STRING);
            put("text", Types.STRING);
            put("boolean", Types.BOOL);
            put("date", Types.DATE_TIME);
            put("cidr", Types.STRING);
            put("ARRAY", Types.LIST);
            put("USER_DEFINED", Types.STRING);
            put("bit.*", Types.BIG_INT);
            put("uuid", Types.STRING);
            put("xml", Types.OBJECT);
        }};
        descriptor.aggregations.add(new AggrFunctionInfo(Stats.STDEV, "stddev(#)", Types.dataFrameNumericTypes));
    }

    @Override
    public Properties getProperties(DataConnection conn) {
        java.util.Properties properties = defaultConnectionProperties(conn);
        if (!conn.hasCustomConnectionString() && conn.ssl()) {
            properties.setProperty("ssl", "true");
            properties.setProperty("sslfactory", "org.postgresql.ssl.NonValidatingFactory");
        }
        return properties;
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        return "jdbc:postgresql://" + conn.getServer() + port + "/" + conn.getDb();
    }

    @Override
    public String getSchemasSql(String db) {
        return "SELECT DISTINCT table_schema FROM information_schema.columns";
    }

    @Override
    public String getSchemaSql(String db, String schema, String table)
    {
        List<String> filters = new ArrayList<String>() {{
            add("c.table_schema = '" + ((schema != null) ? schema : descriptor.defaultSchema) + "'");
        }};

        if (db != null && db.length() != 0)
            filters.add("c.table_catalog = '" + db + "'");

        if (table != null)
            filters.add("c.table_name = '" + table + "'");

        String whereClause = "WHERE " + String.join(" AND \n", filters);

        return "SELECT c.table_schema as table_schema, c.table_name as table_name, c.column_name as column_name, "
                + "c.data_type as data_type, "
                + "case t.table_type when 'VIEW' then 1 else 0 end as is_view FROM information_schema.columns c "
                + "JOIN information_schema.tables t ON t.table_name = c.table_name " + whereClause +
                " ORDER BY c.table_name";
    }

    @Override
    protected boolean isInteger(int type, String typeName, int precision, int scale) {
        if (isPostgresNumeric(typeName)) return false;
        return super.isInteger(type, typeName, precision, scale);
    }

    @Override
    protected boolean isFloat(int type, String typeName, int precision, int scale) {
        return super.isFloat(type, typeName, precision, scale) || isPostgresNumeric(typeName);
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("%s ~ '%s'", columnName, regexExpression);
    }

    private boolean isPostgresNumeric(String typeName) {
        // We need next condition because be default Postgres sets precision and scale to null for numeric type.
        // And ResultSetMetaData.getScale() returns 0 if scale is null.
        return typeName.equalsIgnoreCase("numeric");
    }
}
