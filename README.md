# ArcGIS adapter microservice

[![Build Status](https://travis-ci.com/resource-watch/adapter-arcgis.svg?branch=dev)](https://travis-ci.com/resource-watch/adapter-arcgis)
[![Test Coverage](https://api.codeclimate.com/v1/badges/682efc4cf55c6a795782/test_coverage)](https://codeclimate.com/github/resource-watch/adapter-arcgis/test_coverage)

## Dependencies

You will need [Control Tower](https://github.com/control-tower/control-tower) up and running - either natively or with Docker. Refer to the project's README for information on how to set it up.

The ArcGIS adapter microservice is built using [Node.js](https://nodejs.org/en/), and can be executed either natively or using Docker, each of which has its own set of requirements.

Native execution requires:
- [Node.js](https://nodejs.org/en/)
- [MongoDB](https://www.mongodb.com/)

Execution using Docker requires:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

Dependencies on other Microservices:

- [Dataset](https://github.com/resource-watch/dataset)
- [Converter](https://github.com/resource-watch/converter)
- [Geostore](https://github.com/gfw-api/gfw-geostore-api)

## Getting started

Start by cloning the repository from github to your execution environment

```
git clone https://github.com/resource-watch/adapter-arcgis.git && cd adapter-arcgis
```

After that, follow one of the instructions below:

### Using native execution

1 - Set up your environment variables. See `dev.env.sample` for a list of variables you should set, which are described in detail in [this section](#configuration-environment-variables) of the documentation. Native execution will NOT load the `dev.env` file content, so you need to use another way to define those values

2 - Install node dependencies using yarn:
```
yarn
```

3 - Start the application server:
```
yarn start
```

The endpoints provided by this microservice should now be available through Control Tower's URL.

### Using Docker

1 - Create and complete your `dev.env` file with your configuration. The meaning of the variables is available in this [section](#configuration-environment-variables). You can find an example `dev.env.sample` file in the project root.

2 - Execute the following command to run Control tower:

```
./adapter.sh develop
```

The endpoints provided by this microservice should now be available through Control Tower's URL.

## Testing

There are two ways to run the included tests:

### Using native execution

Follow the instruction above for setting up the runtime environment for native execution, then run:
```
npm test
```

### Using Docker

Follow the instruction above for setting up the runtime environment for Docker execution, then run:
```
./adapter.sh test
```

## Configuration

### Environment variables

- PORT => TCP port in which the service will run
- NODE_PATH => relative path to the source code. Should be `app/src`
- MICROSERVICE_TOKEN => 

You can optionally set other variables, see [this file](config/custom-environment-variables.json) for an extended list.

