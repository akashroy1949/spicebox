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

// Supabase REST endpoint (replace <project-ref>)
const char* SUPABASE_URL = "https://<your-project-ref>.supabase.co/rest/v1/readings";

// Supabase API key (ANON key for dev). Replace with your anon key.
// WARNING: placing this in firmware is insecure. Use only for prototyping/demo.
const char* SUPABASE_API_KEY = "YOUR_SUPABASE_ANON_KEY";

// Posting interval (ms)
const unsigned long POST_INTERVAL_MS = 2000;
unsigned long lastPost = 0;

// Calibration factor (use your current working value)
float calibration_factor = 440.705;

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
  if (!wifiManager.autoConnect("ESP8266-WeightScale")) {
    Serial.println("Failed to connect and hit timeout — restarting...");
    ESP.reset();
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

void sendToSupabase(float weight) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, skipping Supabase POST.");
    return;
  }

  // Build JSON payload (Supabase will set created_at)
  String payload = "{\"deviceId\":\"" + String(deviceId) + "\",\"weight_g\":" + String(weight, 3) + "}";

  // Secure client
  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure());
  // For development/demo: skip certificate validation (INSECURE)
  client->setInsecure();

  HTTPClient https;
  Serial.print("POST -> ");
  Serial.println(SUPABASE_URL);

  if (https.begin(*client, SUPABASE_URL)) {
    https.addHeader("Content-Type", "application/json");
    // send anon key (for dev) — Supabase expects both apikey and Authorization for REST
    https.addHeader("apikey", SUPABASE_API_KEY);
    https.addHeader("Authorization", String("Bearer ") + SUPABASE_API_KEY);
    // Optional: tell Supabase to return the created record
    https.addHeader("Prefer", "return=representation");

    int httpCode = https.POST(payload);
    if (httpCode > 0) {
      String response = https.getString();
      Serial.printf("Supabase POST code: %d\n", httpCode);
      Serial.println("Response: " + response);
    } else {
      Serial.printf("POST failed, error: %s\n", https.errorToString(httpCode).c_str());
    }
    https.end();
  } else {
    Serial.println("Unable to begin HTTPS connection");
  }
}

void loop() {
  float weight = readWeight();
  if (!isnan(weight)) {
    Serial.print("Weight: ");
    Serial.print(weight, 3);
    Serial.println(" g");
  }

  unsigned long now = millis();
  if (now - lastPost >= POST_INTERVAL_MS) {
    lastPost = now;
    if (!isnan(weight)) {
      sendToSupabase(weight);
    } else {
      Serial.println("Skipping POST due to invalid reading");
    }
  }

  delay(500); // keep MCU responsive
}
