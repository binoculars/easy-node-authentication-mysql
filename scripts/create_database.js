/**
 * Created by barrett on 8/28/14.
 */

var mysql = require('mysql');
var dbconfig = require('../config/database');

var connection = mysql.createConnection(dbconfig.connection);

connection.query('CREATE DATABASE ' + dbconfig.database);

connection.query('\
CREATE TABLE `' + dbconfig.database + '`.`' + dbconfig.users_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `username` VARCHAR(60) NULL, \
    `password` CHAR(60) NULL, \
    `facebook_id` INT NULL, \
    `facebook_token` CHAR(223) NULL, \
    `facebook_name` VARCHAR(100) NULL, \
    `facebook_email` VARCHAR(100) NULL, \
        PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` ASC), \
    UNIQUE INDEX `username_UNIQUE` (`username` ASC), \
    UNIQUE INDEX `facebook_id_UNIQUE` (`facebook_id` ASC), \
    UNIQUE INDEX `facebook_token_UNIQUE` (`facebook_token` ASC) \
)');

console.log('Success: Database Created!')

connection.end();
