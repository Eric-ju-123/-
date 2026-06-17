@echo off
chcp 65001 >nul
echo ========================================
echo   Blog Update Articles
echo ========================================
echo.
for /f "tokens=*" %%i in ('dir /b /o:d "%USERPROFILE%\Downloads\articles.json" 2^>nul') do (
    echo [OK] Found: %%i
    copy /Y "%USERPROFILE%\Downloads\%%i" "%~dp0docs\data\articles.json" >nul
    if !errorlevel! equ 0 (
        echo [OK] Copied
    ) else (
        echo [FAIL] Copy failed
        goto :manual
    )
    goto :commit
)

if exist "articles.json" (
    echo [OK] Found articles.json
    copy /Y "articles.json" "docs\data\articles.json" >nul
    if !errorlevel! equ 0 echo [OK] Copied
    goto :commit
)

echo [!] articles.json not found
echo Download from admin panel first
pause
exit /b 1

:commit
echo.
echo [1/3] git add ...
git add docs/data/articles.json
git commit -m "update: sync article data"
echo [OK] Committed
echo.
echo [2/3] git push ...
git push
if !errorlevel! equ 0 (
    echo.
    echo [OK] Update complete!
) else (
    echo [FAIL] Push failed
)
pause
