#include <HX711.h>

// HX711 circuit wiring
#define DOUT  D5   // ESP8266 pin connected to HX711 DOUT
#define CLK   D6   // ESP8266 pin connected to HX711 SCK

HX711 scale;

long rawReading = 0;   // Raw HX711 output
float actualWeight = 0; // User-entered known weight
float calibrationFactor = 0;

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("HX711 Calibration Sketch");
  Serial.println("Remove any weight from the scale...");
  delay(2000);

  scale.begin(DOUT, CLK);

  // Tare (set zero)
  Serial.println("Taring... please wait");
  scale.tare();
  Serial.println("Tare done. Place a known weight on the scale.");
  Serial.println("Then type the actual weight in grams (e.g., 100) in Serial Monitor and press Enter.");
}

void loop() {
  // Check if data available from HX711
  if (scale.is_ready()) {
    rawReading = scale.get_units(10); // Average of 10 readings
    Serial.print("Raw Reading: ");
    Serial.println(rawReading);
  } else {
    Serial.println("HX711 not found.");
  }

  // If user enters actual weight in Serial Monitor
  if (Serial.available() > 0) {
    actualWeight = Serial.parseFloat();
    if (actualWeight > 0) {
      Serial.print("Actual Weight entered: ");
      Serial.println(actualWeight);

      // Calibration factor = Raw value / Actual weight
      calibrationFactor = (float)rawReading / actualWeight;

      Serial.print("Calibration Factor: ");
      Serial.println(calibrationFactor, 6);
      Serial.println("Use this factor in your final sketch with scale.set_scale().");
    }
    // Clear buffer
    while (Serial.available() > 0) Serial.read();
  }

  delay(1000);
}
