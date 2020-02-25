package grok_connect.providers;

import java.sql.*;
import grok_connect.utils.*;
import grok_connect.connectors_info.*;


public class DenodoDataProvider extends JdbcDataProvider {
    public DenodoDataProvider() {
        descriptor = new DataSource();
        descriptor.type = "Denodo";
        descriptor.description = "Query Denodo database";
        descriptor.connectionTemplate = DbCredentials.dbConnectionTemplate;
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
    }

    public Connection getConnection(DataConnection conn) throws ClassNotFoundException, SQLException {
        Class.forName("com.denodo.vdp.jdbc.Driver");
        java.util.Properties properties = defaultConnectionProperties(conn);
        if (conn.parameters.containsKey(DbCredentials.SSL) && (boolean)conn.parameters.get(DbCredentials.SSL))
            properties.setProperty("ssl", "true");
        return DriverManager.getConnection(getConnectionString(conn), properties);
    }

    public String getConnectionString(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        return "jdbc:vdb://" + conn.getServer() + port +  "/" + conn.getDb();
    }
}
