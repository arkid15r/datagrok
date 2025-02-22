---
title: "Postgres"
---

Provides access to [PostgreSQL](https://www.postgresql.org/) database using SQL queries via JDBC driver.

```json
{
  "server": "",
  "port": "",
  "db": "",
  "connString": ""
}
```

## Supported Parameters

| Type                   | Value                | Description or Example     |
|------------------------|----------------------|----------------------------|
| `num`, `int`, `double` | =                    | =100                       |
|                        | >                    | >1.02                      |
|                        | >=                   | >=4.1                      |
|                        | <=                   | <=100                      |
|                        | !=                   | !=5                        |
|                        | in                   | in (1, 3, 10.2)            |
|                        | min-max              | 1.5-10.0                   |
|                        | is null/ is not null |                            |
| `string`               | contains             | contains ea                |
|                        | starts with          | starts with R              |
|                        | ends with            | ends with w                |
|                        | in                   | in (ab, "c d", "e\\"f\\"") |
|                        | regex                | regex ^(.+)@(.+)$          |
|                        | is null/ is not null |                            |
| `datetime`             | anytime              |                            |
|                        | before               | before 1/1/2022            |
|                        | after                | after 1/1/2022             |
|                        | today                |                            |
|                        | this week            |                            |
|                        | this month           |                            |
|                        | this year            |                            |
|                        | last year            |                            |
|                        | min-max              |                            |
|                        | April 2021           |                            |
|                        | last                 | last 10 days, last 2 weeks |
|                        | is null/ is not null |                            |
| `list<string>` (1)     |                      |                            |

* (1) default parameters are not supported

## Supported output types

| Type                 | Supported              |
|----------------------|------------------------|
| bigInt               | :white_check_mark:     |
| integer              | :white_check_mark:     |
| double precision     | :white_check_mark:     |
| real                 | :white_check_mark:     |
| numeric              | :white_check_mark:     |
| serial               | :white_check_mark:     |
| character type       | :white_check_mark:     |
| date/time            | :white_check_mark:     |
| boolean              | :white_check_mark:     |
| bit string           | :white_check_mark:     |
| uuid                 | :white_check_mark:     |
| network address type | :white_check_mark: (1) |
| jsonb, json          | :white_check_mark: (1) |
| xml                  | :white_check_mark: (1) |
| composite types      | :white_check_mark: (1) |
| bytea                | limited support    (2) |
| monetary             | not tested             |

* (1) supported as a string
* (2) you get unreadable representation, but in query you can cast such a types to varchar, hex

## Supported features

* Schema browsing
* Join DB tables
* Aggregation query
* Connection test

See also:

* [Data connection](../../access.md#data-connection)
* [PostgreSQL](https://www.postgresql.org/)
* [Wikipedia](https://en.wikipedia.org/wiki/PostgreSQL)
