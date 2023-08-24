@ECHO off

SET downloadUrl=https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/version
SET tempFile=%cd%\.%random%-tmp

@REM download version file
echo downloading version file
BITSADMIN /transfer /download %downloadUrl% %tempFile% > nul

@REM if the file version is different than file called "version" then download the new version
@REM if not, then exit

if not exist version (
    echo version file not found
    goto download
)

for /f "delims=" %%i in (version) do set version=%%i

for /f "delims=" %%i in (%tempFile%) do set newVersion=%%i

if %version% neq %newVersion% (
    echo new version found
    del version
    ren %tempFile% version
    del %tempFile%
    goto download
) else (
    echo no new version found
    del %tempFile%
    goto exit
)

:download
echo downloading new version
@REM these are the files we want:
@REM package-lock.json
@REM package.json
@REM index.js
@REM download-github.bat
@REM version

@REM after downloading, we want to install nodejs
@REM then we want to run npm install

@REM download files:

BITSADMIN /transfer /download https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/package-lock.json %cd%\package-lock.json > nul
BITSADMIN /transfer /download https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/package.json %cd%\package.json > nul
BITSADMIN /transfer /download https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/index.js %cd%\index.js > nul
BITSADMIN /transfer /download https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/download-github.bat %cd%\download-github.bat > nul
BITSADMIN /transfer /download https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/version %cd%\version > nul

@REM install nodejs

set NULL_VAL=null
set NODE_VER=%NULL_VAL%
set NODE_EXEC=node-v18.17.1-x64.msi

node -v >.tmp_nodever
set /p NODE_VER=<.tmp_nodever
del .tmp_nodever

IF "%NODE_VER%"=="%NULL_VAL%" (
    echo.
    echo Node.js is not installed! Please press a key to download and install it from the website that will open.
    PAUSE
    start "" http://nodejs.org/dist/v18.17.1/%NODE_EXEC%
    echo.
    echo.
    echo After you have installed Node.js, press a key to shut down this process. Please restart it again afterwards.
    PAUSE
    EXIT
) ELSE (
    echo A version of Node.js ^(%NODE_VER%^) is installed. Proceeding...
)

@REM run npm install

echo installing dependencies
npm install
goto exit

:exit
echo.
echo.
echo Press a key to exit.
pause
