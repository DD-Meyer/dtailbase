# Test API endpoints on VPS with authentication

# Step 1: Get a valid JWT token (login)
curl -X POST https://detailerflow.netictechnologies.com/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'

# This returns: {"access":"JWT_TOKEN_HERE","refresh":"REFRESH_TOKEN"}

# Step 2: Copy the access token and test bookings endpoint
TOKEN="your_jwt_token_from_above"

curl -i -H "Authorization: Bearer $TOKEN" \
  https://detailerflow.netictechnologies.com/api/bookings/

# Step 3: Test the specific endpoint that was failing (status update)
BOOKING_UUID="f81c6307-0e29-46db-b7d5-c7b10937db59"  # Replace with real UUID

curl -i -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}' \
  https://detailerflow.netictechnologies.com/api/bookings/$BOOKING_UUID/update_status/

# Step 4: Check if media files are loading (should be 200, not 404)
curl -i https://detailerflow.netictechnologies.com/media/vehicle_photos/test.jpg

# Step 5: Check signatures endpoint
curl -i https://detailerflow.netictechnologies.com/media/signatures/test.png

# If all of these return 200/2xx or proper errors (not 500), you're good!
