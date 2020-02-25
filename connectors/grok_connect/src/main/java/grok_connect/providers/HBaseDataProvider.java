package grok_connect.providers;

import java.sql.*;
import grok_connect.utils.*;
import grok_connect.connectors_info.*;


public class HBaseDataProvider extends JdbcDataProvider {
    public HBaseDataProvider() {
        descriptor = new DataSource();
        descriptor.type = "HBase";
        descriptor.description = "Query HBase database";
        descriptor.connectionTemplate = DbCredentials.dbConnectionTemplate;
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
    }

    public Connection getConnection(DataConnection conn) throws ClassNotFoundException, SQLException {
        Class.forName("org.apache.phoenix.queryserver.client.Driver");
        java.util.Properties properties = defaultConnectionProperties(conn);
        properties.setProperty("serialization", "PROTOBUF");
        if (conn.parameters.containsKey(DbCredentials.SSL) && (boolean)conn.parameters.get(DbCredentials.SSL))
            properties.setProperty("sslConnection", "true");
        return DriverManager.getConnection(getConnectionString(conn), properties);
    }

    public String getConnectionString(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        return "jdbc:phoenix:thin:url=http://" + conn.getServer() + port;
    }
}
