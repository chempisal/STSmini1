@echo off
chcp 65001 >nul
title ដំណើរការប្រព័ន្ធគ្រប់គ្រងសាលារៀន KruSmart
echo ========================================================
echo   ប្រព័ន្ធត្រួតពិនិត្យ និងដំណើរការកម្មវិធី KruSmart ERP
echo ========================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] មិនទាន់រកឃើញ Node.js នៅក្នុងកុំព្យូទ័ររបស់លោកអ្នកឡើយ!
    echo [i] ប្រព័ន្ធកំពុងទាញយក Node.js v20.15.0 ដោយស្វ័យប្រវត្ត...
    echo.
    
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.15.0/node-v20.15.0-x64.msi' -OutFile 'node-installer.msi'"
    
    echo.
    echo [i] កំពុងដំឡើង Node.js ទៅក្នុងកុំព្យូទ័រលោកអ្នក (Silent Installation)...
    echo.
    msiexec /i node-installer.msi /qn /norestart
    
    echo [i] កំពុងលុបឯកសារដំឡើងបណ្តោះអាសន្ន...
    del node-installer.msi
    
    echo.
    echo ========================================================
    echo   [SUCCESS] បានដំឡើង Node.js រួចរាល់ហើយ!
    echo   សូមបិទផ្ទាំងនេះ ហើយចុចពីរដង (Double Click) លើឯកសារ bat នេះម្តងទៀត។
    echo ========================================================
    echo.
    pause
    exit
)

echo [✓] រកឃើញ Node.js រួចជាស្រេច!
echo.
echo [i] កំពុងពិនិត្យ និងដំឡើងឯកសារដំណើរការគម្រោង (npm install)...
echo.
call npm install

echo.
echo [✓] ដំឡើងកញ្ចប់ឯកសារគម្រោងរួចរាល់!
echo.
echo [i] កំពុងដំណើរការកម្មវិធី KruSmart Desktop App...
echo.
call npm start
pause
