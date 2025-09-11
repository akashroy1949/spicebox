/*
  ESP8266 + HX711 -> Direct POST to Supabase (DEV)
  - Uses WiFiManager for provisioning
  - Uses WiFiClientSecure with setInsecure() (development)
  - Posts JSON { deviceId, weight_g } to Supabase REST endpoint
  IMPORTANT: For production, do NOT store API keys on device.
*/

#include <HX711.h>
#include <ESP8266WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecureBearSSL.h>
#include <ESP8266HTTPClient.h>

// HX711 pins (your original)
const int LOADCELL_DOUT_PIN = D5; // GPIO14
const int LOADCELL_SCK_PIN  = D6; // GPIO12

// Device identifier
const char* deviceId = "spicebox-01";

// Supabase REST endpoint (project-specific)
const char* SUPABASE_URL = "https://miozfvxmnehtxqgnnmcm.supabase.co/rest/v1/readings";

// Supabase API key (ANON key for dev). WARNING: insecure on device; for prototyping only.
const char* SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pb3pmdnhtbmVodHhxZ25ubWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMzc2MjgsImV4cCI6MjA3MjgxMzYyOH0.hexMhnc5G1SkwURPYHXaYS7XgSQwnH5xQspw4AfxwgI";

// Posting interval (ms)
const unsigned long POST_INTERVAL_MS = 2000;
unsigned long lastPost = 0;

// Calibration factor (use your current working value)
float calibration_factor =  639.619019;

// HX711 object
HX711 scale;

void setup() {
  Serial.begin(115200);
  delay(200);

  // Initialize HX711
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(calibration_factor);
  scale.tare();
  Serial.println("HX711 initialized and tared.");

  // WiFiManager: start portal if no saved credentials
  WiFiManager wifiManager;
  Serial.println("Starting Wi-Fi Manager (AP: ESP8266-WeightScale) ...");
  if (!wifiManager.autoConnect(deviceId)) {
    Serial.println("Failed to connect and hit timeout — restarting...");
    ESP.restart();
    delay(1000);
  }

  Serial.println("Connected to Wi-Fi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

float readWeight() {
  if (!scale.is_ready()) {
    Serial.println("HX711 not found.");
    return NAN;
  }
  float w = scale.get_units(5); // average of 5 readings
  return w;
}

void deleteOldReadings(String latestReadingResponse = "") {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, skipping deletion.");
    return;
  }

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure());
  client->setInsecure();

  HTTPClient https;
  String latestId = "";

  // If we have the POST response, use it directly instead of making a GET request
  if (latestReadingResponse.length() > 0) {
    Serial.println("Using POST response for deletion: " + latestReadingResponse);
    
    // Parse JSON to extract id from POST response
    int idStart = latestReadingResponse.indexOf("\"id\":");
    if (idStart != -1) {
      idStart += 5; // Skip "id":
      // Find the end of the number (comma or closing bracket)
      int idEnd = latestReadingResponse.indexOf(",", idStart);
      if (idEnd == -1) {
        idEnd = latestReadingResponse.indexOf("}", idStart);
      }
      if (idEnd != -1) {
        latestId = latestReadingResponse.substring(idStart, idEnd);
        latestId.trim(); // Remove any whitespace
        Serial.println("Latest reading ID from POST: " + latestId);
      }
    }
  } else {
    // Fallback: GET the latest reading for this device (original logic)
    Serial.println("No POST response provided, making GET request for latest reading");
    String getUrl = String(SUPABASE_URL) + "?deviceid=eq." + deviceId + "&order=created_at.desc&limit=1";

    if (https.begin(*client, getUrl)) {
      https.setTimeout(8000);
      https.addHeader("apikey", SUPABASE_API_KEY);
      https.addHeader("Authorization", String("Bearer ") + SUPABASE_API_KEY);
      https.addHeader("Accept", "application/json");

      int httpCode = https.GET();
      Serial.printf("GET request to get latest reading - HTTP code: %d\n", httpCode);

      if (httpCode == 200) {
        String response = https.getString();
        Serial.println("GET response: " + response);
        
        if (response.length() > 2) {
          // Parse JSON to extract id (id is a number, not a string)
          int idStart = response.indexOf("\"id\":");
          if (idStart != -1) {
            idStart += 5; // Skip "id":
            // Find the end of the number (comma or closing bracket)
            int idEnd = response.indexOf(",", idStart);
            if (idEnd == -1) {
              idEnd = response.indexOf("}", idStart);
            }
            if (idEnd != -1) {
              latestId = response.substring(idStart, idEnd);
              latestId.trim(); // Remove any whitespace
              Serial.println("Latest reading ID: " + latestId);
            }
          }
        } else {
          Serial.println("No readings found for this device");
        }
      } else {
        String response = https.getString();
        Serial.println("GET failed - Response: " + response);
      }
      https.end();
    }
  }

  // DELETE all readings except the latest one
  if (latestId.length() > 0) {
    String deleteUrl = String(SUPABASE_URL) + "?deviceid=eq." + deviceId + "&id=neq." + latestId;

    if (https.begin(*client, deleteUrl)) {
      https.setTimeout(8000);
      https.addHeader("Content-Type", "application/json");
      https.addHeader("apikey", SUPABASE_API_KEY);
      https.addHeader("Authorization", String("Bearer ") + SUPABASE_API_KEY);
      https.addHeader("Prefer", "return=minimal");

      int httpCode = https.sendRequest("DELETE");
      Serial.printf("DELETE request to clean old readings - HTTP code: %d\n", httpCode);

      if (httpCode == 200 || httpCode == 204) {
        String response = https.getString();
        Serial.println("DELETE successful - Response: " + response);
        Serial.println("Old readings cleaned up successfully");
      } else {
        String response = https.getString();
        Serial.printf("Delete failed: %d\n", httpCode);
        Serial.println("DELETE error response: " + response);
      }
      https.end();
    }
  }
}

bool sendToSupabase(float weight, String &postResponse) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, skipping Supabase POST.");
    return false;
  }

  // Build JSON payload (Supabase will set created_at)
  String payload = "{\"deviceid\":\"" + String(deviceId) + "\",\"weight_g\":" + String(weight, 3) + "}";

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure());
  client->setInsecure();

  HTTPClient https;
  Serial.print("POST -> ");
  Serial.println(SUPABASE_URL);

  bool success = false;

  if (https.begin(*client, SUPABASE_URL)) {
    https.setTimeout(8000); // 8s HTTP timeout
    https.addHeader("Content-Type", "application/json");
    // send anon key (for dev) — Supabase expects both apikey and Authorization for REST
    https.addHeader("apikey", SUPABASE_API_KEY);
    https.addHeader("Authorization", String("Bearer ") + SUPABASE_API_KEY);
    // Optional: tell Supabase to return the created record
    https.addHeader("Prefer", "return=representation");

    // Simple retry loop with backoff
    int attempts = 0;
    const int maxAttempts = 2;
    int httpCode = -1;
    
    while (attempts < maxAttempts) {
      httpCode = https.POST(payload);
      if (httpCode > 0) break;
      delay(500 * (attempts + 1));
      attempts++;
    }

    if (httpCode > 0) {
      postResponse = https.getString();
      Serial.printf("Supabase POST code: %d\n", httpCode);
      Serial.println("Response: " + postResponse);
      success = (httpCode >= 200 && httpCode < 300);
    } else {
      Serial.printf("POST failed, error: %s\n", https.errorToString(httpCode).c_str());
    }
    https.end();
  } else {
    Serial.println("Unable to begin HTTPS connection");
  }
  
  return success;
}

void loop() {
  float weight = readWeight();
  if (!isnan(weight)) {
    Serial.print("Weight: ");
    Serial.print(weight, 3);
    Serial.println(" g");
  }

  unsigned long now = millis();
  if ((now - lastPost >= POST_INTERVAL_MS)) {
    lastPost = now;
    if (!isnan(weight)) {
      // POST to Supabase and capture the response
      String postResponse = "";
      if (sendToSupabase(weight, postResponse)) {
        // Pass the POST response directly to delete function to avoid extra GET request
        deleteOldReadings(postResponse);
      }
    } else {
      Serial.println("Skipping POST due to invalid reading");
    }
  }

  delay(500); // keep MCU responsive
}
