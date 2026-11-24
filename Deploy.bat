@echo off
setlocal enabledelayedexpansion
title Motiba Sales - Build and Deployment Utility

:MENU
cls
echo ========================================================================
echo             MOTIBA SALES MOBILE APP
echo                     BUILD AND DEPLOYMENT UTILITY
echo ========================================================================
echo.
echo  Please select an option:
echo.
echo   [1] Build Android APK (Cloud Build via EAS - Direct Installable .apk)
echo   [2] Build Android APK (Local Build via Expo Prebuild and Gradle)
echo   [3] Build Web View (Static Production Bundle in /dist)
echo   [4] Preview / Run Web View in Browser (Local Host)
echo   [5] Start Development Server (Android / iOS / Web Live Metro)
echo   [6] Run Full Project Diagnostics (TypeScript and Expo Doctor)
echo   [7] Exit
echo.
echo ========================================================================
choice /c 1234567 /m "Enter your selection [1-7]: "
set SELECTION=%ERRORLEVEL%

if "%SELECTION%"=="7" goto EXIT_SCRIPT
if "%SELECTION%"=="6" goto RUN_DIAGNOSTICS
if "%SELECTION%"=="5" goto START_METRO
if "%SELECTION%"=="4" goto PREVIEW_WEB
if "%SELECTION%"=="3" goto BUILD_WEB
if "%SELECTION%"=="2" goto BUILD_LOCAL_APK
if "%SELECTION%"=="1" goto BUILD_EAS_APK

goto MENU

:: ----------------------------------------------------------------------------
:: [1] Build Android APK via EAS Cloud
:: ----------------------------------------------------------------------------
:BUILD_EAS_APK
cls
echo ========================================================================
echo           OPTION 1: BUILD ANDROID APK VIA EAS CLOUD (PREVIEW)
echo ========================================================================
echo.
echo This command will trigger a cloud build generating a standalone installable
echo .apk file using your Expo/EAS account configured in eas.json.
echo.
pause
echo.
echo [1/2] Verifying TypeScript code integrity...
call npx tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] TypeScript compilation failed. Please fix errors before building.
    pause
    goto MENU
)

echo.
echo [2/2] Launching EAS Android APK Preview Build...
call npx eas-cli@16.28.0 build --platform android --profile preview
echo.
echo EAS Build process finished.
pause
goto MENU

:: ----------------------------------------------------------------------------
:: [2] Build Android APK Locally via Gradle
:: ----------------------------------------------------------------------------
:BUILD_LOCAL_APK
cls
echo ========================================================================
echo           OPTION 2: BUILD ANDROID APK LOCALLY VIA GRADLE
echo ========================================================================
echo.
echo Note: This requires Android SDK, JDK 17, and Android build tools installed.
echo.
pause
echo.
echo [1/3] Verifying TypeScript code integrity...
call npx tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] TypeScript check failed.
    pause
    goto MENU
)

echo.
echo [2/3] Generating native Android project files (Expo Prebuild)...
call npx expo prebuild --platform android --clean
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Native Android prebuild generation failed.
    pause
    goto MENU
)

echo.
echo [3/3] Compiling Release APK using Gradle wrapper...
cd android
call gradlew.bat assembleRelease
set GRADLE_ERR=%ERRORLEVEL%
cd ..

if %GRADLE_ERR% NEQ 0 (
    echo.
    echo [ERROR] Gradle compilation encountered errors.
    pause
    goto MENU
)

echo.
echo ========================================================================
echo [SUCCESS] Android APK built successfully!
echo APK Location: android\app\build\outputs\apk\release\app-release.apk
echo ========================================================================
echo.
pause
goto MENU

:: ----------------------------------------------------------------------------
:: [3] Build Web View (Production Static Bundle)
:: ----------------------------------------------------------------------------
:BUILD_WEB
cls
echo ========================================================================
echo           OPTION 3: BUILD WEB VIEW (PRODUCTION STATIC BUNDLE)
echo ========================================================================
echo.
echo Compiling the production web application into the /dist directory...
echo.
echo [1/2] Verifying TypeScript check...
call npx tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] TypeScript check failed.
    pause
    goto MENU
)

echo.
echo [2/2] Exporting static production web bundle...
call npx expo export -p web
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Web export failed.
    pause
    goto MENU
)

echo.
echo ========================================================================
echo [SUCCESS] Web View bundle generated successfully in: \dist
echo This directory can be uploaded directly to any static host, Netlify, Vercel,
echo or loaded in WebView / mobile browsers.
echo ========================================================================
echo.
pause
goto MENU

:: ----------------------------------------------------------------------------
:: [4] Preview / Run Web View Locally in Browser
:: ----------------------------------------------------------------------------
:PREVIEW_WEB
cls
echo ========================================================================
echo           OPTION 4: RUN / PREVIEW WEB VIEW IN BROWSER
echo ========================================================================
echo.
echo Starting Expo web development server...
echo Press 'w' to reopen the browser, or 'Ctrl+C' to stop.
echo.
call npx expo start --web
goto MENU

:: ----------------------------------------------------------------------------
:: [5] Start Metro Dev Server
:: ----------------------------------------------------------------------------
:START_METRO
cls
echo ========================================================================
echo           OPTION 5: START EXPO METRO DEVELOPMENT SERVER
echo ========================================================================
echo.
echo Scan the QR code using Expo Go or development client.
echo Press 'a' for Android, 'i' for iOS, 'w' for Web, 'r' to reload.
echo.
call npx expo start
goto MENU

:: ----------------------------------------------------------------------------
:: [6] Run Diagnostics
:: ----------------------------------------------------------------------------
:RUN_DIAGNOSTICS
cls
echo ========================================================================
echo           OPTION 6: PROJECT DIAGNOSTICS AND SYSTEM CHECKS
echo ========================================================================
echo.
echo [1/2] Checking TypeScript strict compiler...
call npx tsc --noEmit
if %ERRORLEVEL% EQU 0 (
    echo [PASS] TypeScript check passed with 0 errors!
) else (
    echo [FAIL] TypeScript errors detected.
)

echo.
echo [2/2] Running Expo Doctor...
call npx expo-doctor
echo.
pause
goto MENU

:EXIT_SCRIPT
cls
echo Exiting Deploy utility. Goodbye!
exit /b 0
