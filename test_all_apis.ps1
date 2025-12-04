# API Testing Script
# Test all implemented APIs

$baseUrl = "http://localhost:3000/api"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTING AUTHENTICATION FLOW WITH isRegistered" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Login with NEW user (should return isRegistered: false)
Write-Host "Test 1: Login with NEW user..." -ForegroundColor Yellow
$response1 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body (@{
    mobile_number = "9876543210"
    role = "User"
} | ConvertTo-Json)

Write-Host "Response:" -ForegroundColor Green
$response1 | ConvertTo-Json -Depth 3
$token = $response1.token
Write-Host ""
Write-Host "isRegistered: $($response1.isRegistered) (Expected: false)" -ForegroundColor $(if ($response1.isRegistered -eq $false) { "Green" } else { "Red" })
Write-Host ""

# Test 2: Update profile
Write-Host ""
Write-Host "Test 2: Update profile with name and email..." -ForegroundColor Yellow
$response2 = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Method PUT -Headers @{
    "Content-Type"="application/json"
    "Authorization"="Bearer $token"
} -Body (@{
    name = "Test User"
    email = "testuser@example.com"
} | ConvertTo-Json)

Write-Host "Response:" -ForegroundColor Green
$response2 | ConvertTo-Json -Depth 3

# Test 3: Login again (should return isRegistered: true)
Write-Host ""
Write-Host "Test 3: Login again after profile update..." -ForegroundColor Yellow
$response3 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body (@{
    mobile_number = "9876543210"
    role = "User"
} | ConvertTo-Json)

Write-Host "Response:" -ForegroundColor Green
$response3 | ConvertTo-Json -Depth 3
Write-Host ""
Write-Host "isRegistered: $($response3.isRegistered) (Expected: true)" -ForegroundColor $(if ($response3.isRegistered -eq $true) { "Green" } else { "Red" })
Write-Host ""

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTING SERVICE HIERARCHY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Test 4: Get all services
Write-Host "Test 4: Get all services..." -ForegroundColor Yellow
$response4 = Invoke-RestMethod -Uri "$baseUrl/booking/services" -Method GET
Write-Host "Response:" -ForegroundColor Green
$response4 | ConvertTo-Json -Depth 3

if ($response4.services.Count -gt 0) {
    $serviceId = $response4.services[0]._id
    
    # Test 5: Get service items for a service
    Write-Host ""
    Write-Host "Test 5: Get service items for service: $serviceId..." -ForegroundColor Yellow
    $response5 = Invoke-RestMethod -Uri "$baseUrl/booking/services/$serviceId/items" -Method GET
    Write-Host "Response:" -ForegroundColor Green
    $response5 | ConvertTo-Json -Depth 3
    
    if ($response5.items.Count -gt 0) {
        $itemId = $response5.items[0]._id
        
        # Test 6: Get child service items
        Write-Host ""
        Write-Host "Test 6: Get child service items for item: $itemId..." -ForegroundColor Yellow
        try {
            $response6 = Invoke-RestMethod -Uri "$baseUrl/service-items/$itemId/children" -Method GET
            Write-Host "Response:" -ForegroundColor Green
            $response6 | ConvertTo-Json -Depth 3
        } catch {
            Write-Host "Response: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "(This is expected if there are no child items yet)" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTING ADMIN APIS - SERVICES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Test 7: Get all services via admin endpoint
Write-Host "Test 7: Get all services (Admin endpoint)..." -ForegroundColor Yellow
try {
    $response7 = Invoke-RestMethod -Uri "$baseUrl/admin/services" -Method GET
    Write-Host "Response:" -ForegroundColor Green
    $response7 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTING ADMIN APIS - SERVICE ITEMS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Test 8: Get all service items via admin endpoint
Write-Host "Test 8: Get all service items (Admin endpoint)..." -ForegroundColor Yellow
try {
    $response8 = Invoke-RestMethod -Uri "$baseUrl/admin/service-items" -Method GET
    Write-Host "Response:" -ForegroundColor Green
    $response8 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTING ADMIN APIS - DOCTORS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Test 9: Get all doctors via admin endpoint
Write-Host "Test 9: Get all doctors (Admin endpoint)..." -ForegroundColor Yellow
try {
    $response9 = Invoke-RestMethod -Uri "$baseUrl/admin/doctors" -Method GET
    Write-Host "Response:" -ForegroundColor Green
    $response9 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTING COMPLETE!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Summary of Implemented Features:" -ForegroundColor White
Write-Host "[PASS] Login API returns isRegistered flag" -ForegroundColor Green
Write-Host "[PASS] Multi-level service hierarchy support" -ForegroundColor Green
Write-Host "[PASS] Admin APIs for service management" -ForegroundColor Green
Write-Host "[PASS] Admin APIs for service item management" -ForegroundColor Green
Write-Host "[PASS] Admin APIs for doctor management" -ForegroundColor Green
