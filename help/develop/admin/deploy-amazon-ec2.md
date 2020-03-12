<!-- TITLE: Install Datagrok on AWS EC2 -->
<!-- SUBTITLE: -->

# Install Datagrok on AWS EC2

This document contains instructions to deploy Datagrok on AWS EC2 instance.

## Prerequisites

1. Configure S3 bucket and RDS database
2. Create t2.medium EC2 instance for Datagrok VM and c5.xlarge from CVM.

## Setup Datagrok Virtual Machine

1. Copy latest Datagrok Virtual Machine docker image URL from [dev.datagrok.ai/docker_images](https://dev.datagrok.ai/docker_images)
2. Download Datagrok image `wget IMAGE_URL`, load image to docker `docker load < <IMAGE_NAME>`
3. Prepare string GROK_START_PARAMETERS:
 ```
{
"amazonStorageRegion": "us-east-2",                             # S3 region
"amazonStorageBucket": "datagrok-test",                         # S3 bucket name
"amazonStorageId": "ACCOUNTID",                                 # S3 credential ID, Datagrok will resolve EC2 role if empty
"amazonStorageKey": "SECRETKEY",                                # S3 credential secret key, Datagrok will resolve EC2 role if empty
"dbServer": "datagrok-db-1.abc.us-east-2.rds.amazonaws.com",    # RDS endpoint
"db": "datagrok_docker",                                        # RDS new database name
"dbLogin": "datagrok_docker",                                   # RDS new user name
"dbPassword": "SoMeCoMpLeXpAsSwOrD",                            # RDS new user password
"dbAdminLogin": "postgres",                                     # RDS admin login
"dbAdminPassword": "postgres"                                   # RDS admin password
}
```
4. Run Datagrok image in deploy mode
`docker run -it -e GROK_PARAMETERS="<GROK_START_PARAMETERS>" -e GROK_MODE=deploy -p 80:80 <IMAGE_NAME>`, wait for deploy process to complete
5. Run Datagrok image in regular mode
`docker run -it -e GROK_PARAMETERS="<GROK_START_PARAMETERS>" -e GROK_MODE=start -p 80:80 <IMAGE_NAME>`
6. Check if Datagrok started successfully: http://localhost, login to Datagrok using username "admin" and password "SM9ekKEkZuBDp5eD"

## Setup Compute Virtual Machine

1. Copy latest Compute Virtual Machine docker image URL from [dev.datagrok.ai/docker_images](https://dev.datagrok.ai/docker_images)
2. Download Datagrok image `wget IMAGE_URL`, load image to docker `docker load < <IMAGE_NAME>`
3. Run CVM image `docker run -it -e GROK_COMPUTE_NUM_CORES=4 -p 80:80 -p 54321:54321 <IMAGE_NAME>`

Edit settings in the Datagrok (Tools | Settings...):
* Dev:
    * OpenCPU: http://CVM_HOSTNAME/ocpu
    * Jupyter Notebook: http://CVM_HOSTNAME
    * Jupyter Gateway: http://CVM_HOSTNAME/jupyter
    * Grok Compute: http://CVM_HOSTNAME/grok_compute
* Machine Learning:
    * H2O: http://CVM_HOSTNAME:54321

See also:
* [Compute VM](../../compute/compute-vm.md)
* [Architecture](architecture.md#application)
