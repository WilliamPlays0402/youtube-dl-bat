@ECHO off

SET downloadUrl=https://api.github.com/users/marktiedemann
SET tempFile=%cd%\.%random%-tmp

BITSADMIN /transfer /download %downloadUrl% %tempFile% > nul