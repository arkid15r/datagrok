
<!-- TITLE: Deployment with Docker Compose -->
<!-- SUBTITLE: -->

# Deployment with Docker Compose

This document contains instructions for running Datagrok on a regular machine via [Docker Compose](https://docs.docker.com/compose/).

This method doesn't require cloud-based hosting. It automatically fetches, configures and runs the required docker images.

If you want to jump-start with Datagrok on your local machine, we recommend this method. If you need to manually install PostgreSQL and put Datagrok's working data on a host machine's file system, check [Deployment on a regular machine](deploy-regular.md).

## Prerequisites

1. [Docker Compose](https://docs.docker.com/compose/). If you do not have it, follow these [installation instructions](https://docs.docker.com/compose/install/) for your operating system.
2. Ideally, you should have at least 30 GB of free disk space.

## Instructions

1. Create a directory:
   ```
   mkdir datagrok
   cd datagrok
   ```

2. In this folder, create a file `docker-compose.yaml` with the following contents (you can get the specific versions of `datagrok/datagrok` and `datagrok/cvm` from our [Docker Hub page](https://hub.docker.com/u/datagrok)):
    ```yaml
    version: "3"
    services:
      db:
        image: postgres
        environment:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        networks:
          datagrok:
            aliases:
              - database
        volumes:
          - datagrok_db:/var/lib/postgresql/data
      datagrok:
        image: datagrok/datagrok:latest
        environment:
          GROK_PARAMETERS: "{\"deployDemo\": false, \"dbServer\": \"database\", \"db\": \"datagrok\", \"dbAdminLogin\": \"postgres\", \"dbAdminPassword\": \"postgres\", \"dbLogin\": \"dg\", \"dbPassword\": \"dg\", \"adminPassword\": \"admin\", \"adminDevKey\": \"admin\"}"
        ports:
          - "8080:8080"
        networks:
          datagrok:
            aliases:
              - datagrok
        volumes:
          - datagrok_data:/home/grok/data
          - datagrok_cfg:/home/grok/cfg
      cvm:
        image: datagrok/cvm:1.0.X-5babeb5
        environment:
          GROK_COMPUTE_NUM_CORES: 4
        ports:
          - "5005:5005"
          - "8090:8090"
          - "54321:54321"
        networks:
          datagrok:
            aliases:
              - cvm
    volumes: 
      datagrok_db:
      datagrok_data:
      datagrok_cfg:
    networks:
      datagrok:
    ```

3. To start up Datagrok, run this command:  
   ```
   docker-compose up
   ```  
   Datagrok will deploy a new database automatically.
   
   In case you get an error on Windows running `docker compose up` related to a `WriteFile` function, try running `cmd` in Administrator
   mode (this is a [known issue](https://github.com/docker/compose/issues/4531) of Docker on some computers).

4. Once the server is up and running, the Login page should be available at [`http://localhost:8080`](http://localhost:8080). For a quick setup, login to Datagrok using a username `admin` and a password `admin`. To change your password, pass a key-value pair `"adminPassword": "yourPassword"` to the JSON string `GROK_PARAMETERS`.

5. After Datagrok is deployed for the first time, you can shut it down using `Ctrl+C`. Alternatively, run the command:
   ```  
   docker-compose down  
   ```  
   All the data will be saved in the persistent storage ([Docker volumes](https://docs.docker.com/storage/volumes/)). If you want to reset Datagrok to factory settings, run the following command instead:  
   ```  
   docker-compose down --volumes  
   ```  
6. You may use the following commands to comfortably continue working with the existing containers:
   ```
   docker-compose up -d
   docker-compose stop
   ```
   Start in a detached mode allows running the containers in the background leaving out the logs, while the `stop`
   command, as opposed to `docker-compose down`, does not remove the network and the stopped containers after use.

See also:

   * [Docker Compose](https://docs.docker.com/compose/)
   * [Deployment on a regular machine](deploy-regular.md)
