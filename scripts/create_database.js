/**
 * Created by barrett on 8/28/14.
 */

var mysql = require('mysql');
var dbconfig = require('../config/database');

var connection = mysql.createConnection(dbconfig.connection);

connection.query('CREATE DATABASE ' + dbconfig.database);

connection.query('\
CREATE TABLE `' + dbconfig.database + '`.`' + dbconfig.users_table + '` ( \
    `id`                  INT UNSIGNED NOT NULL  AUTO_INCREMENT, \
    `username`            VARCHAR(60)  NULL, \
    `password`            CHAR(60)     NULL, \
    `facebook_id`         INT UNSIGNED NULL, \
    `facebook_token`      CHAR(223)    NULL, \
    `facebook_name`       VARCHAR(100) NULL, \
    `facebook_email`      VARCHAR(100) NULL, \
    `twitter_id`          INT UNSIGNED NULL, \
    `twitter_token`       VARCHAR(60)  NULL, \
    `twitter_username`    VARCHAR(15)  NULL, \
    `twitter_displayName` VARCHAR(100) NULL, \
    `google_id`           VARCHAR(50)  NULL, \
    `google_token`        CHAR(67)     NULL, \
    `google_name`         VARCHAR(100) NULL, \
    `google_email`        VARCHAR(100) NULL, \
    PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` ASC), \
    UNIQUE INDEX `username_UNIQUE` (`username` ASC), \
    UNIQUE INDEX `facebook_id_UNIQUE` (`facebook_id` ASC), \
    UNIQUE INDEX `facebook_token_UNIQUE` (`facebook_token` ASC), \
    UNIQUE INDEX `twitter_id_UNIQUE` (`twitter_id` ASC), \
    UNIQUE INDEX `twitter_token_UNIQUE` (`twitter_token` ASC), \
    UNIQUE INDEX `google_id_UNIQUE` (`google_id` ASC), \
    UNIQUE INDEX `google_token_UNIQUE` (`google_token` ASC) \
)');

console.log('Success: Database Created!')

connection.end();
