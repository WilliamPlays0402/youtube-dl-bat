@ECHO off

SET downloadUrl=https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/version
if not exist %cd%\data (
    mkdir %cd%\data
)
SET versionPath = %cd%\data\version
SET tempFile=%cd%\data\newVersion

@REM download version file
echo Downloading version file
BITSADMIN /transfer /download %downloadUrl% %tempFile% > nul

@REM if the new version is different than file called "version" in folder called "data" then download the new version
@REM if not, then exit

echo Comparing versions
if not exist %cd%\data\version (
    echo Version file not found! Downloading...
    goto download
)

for /f "delims=" %%i in (%cd%\data\version) do set version=%%i

for /f "delims=" %%i in (%tempFile%) do set newVersion=%%i

if not "%version%"=="%newVersion%" (
    echo New version found! Downloading...
    del %cd%\data\version
    ren %tempFile% version
    goto download
) else (
    echo No new version found. Starting...
    del %tempFile%
    node ./data/index.js %cd%
    goto stop
)

:download
echo Downloading new version
@REM these are the files we want:
@REM package-lock.json
@REM package.json
@REM index.js
@REM download-github.bat
@REM version

@REM after downloading, we want to install nodejs
@REM then we want to run npm install

@REM download files:

BITSADMIN /transfer /download https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/package-lock.json %cd%\data\package-lock.json > nul
BITSADMIN /transfer /download https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/package.json %cd%\data\package.json > nul
BITSADMIN /transfer /download https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/index.js %cd%\data\index.js > nul
BITSADMIN /transfer /download https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/download-github.bat %cd%\download-github.bat > nul
BITSADMIN /transfer /download https://raw.githubusercontent.com/WilliamPlays0402/youtube-dl-bat/main/version %cd%\data\version > nul

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

@REM run npm install in folder "data"

echo installing dependencies
cd data
npm install
echo Dependencies installed. Starting...
node ./data/index.js %cd%
cd ..
goto stop

:stop
echo.
echo.
echo Press a key to exit.
PAUSE > nul
