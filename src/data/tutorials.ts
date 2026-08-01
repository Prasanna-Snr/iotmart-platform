import type { Tutorial } from "@/types";
import { tutorialCategories } from "./categories";

const [homeAuto, weatherMon, smartAg, security, robotics] = tutorialCategories;

export const tutorials: Tutorial[] = [
  {
    id: "tut-1",
    title: "Build a Smart Temperature & Humidity Monitor with ESP32",
    slug: "smart-temperature-humidity-monitor-esp32",
    description:
      "In this tutorial, you'll build a complete IoT temperature and humidity monitoring system using an ESP32 microcontroller and DHT22 sensor. The data is displayed on an OLED screen and sent to a web dashboard in real-time via WiFi.",
    shortDescription:
      "Build a WiFi-connected temperature and humidity monitor with ESP32, DHT22, and OLED display.",
    difficulty: "Beginner",
    estimatedTime: "2–3 hours",
    category: homeAuto,
    components: [
      "ESP32 DevKit",
      "DHT22 Sensor",
      "0.96\" OLED Display",
      "Breadboard",
      "Jumper Wires",
      "Micro USB Cable",
    ],
    sensors: ["DHT22 Temperature/Humidity Sensor"],
    microcontrollers: ["ESP32"],
    circuitDiagram: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    wiringInstructions: [
      {
        component: "DHT22",
        pin: "VCC",
        microcontrollerPin: "3.3V",
        description: "Power pin",
      },
      {
        component: "DHT22",
        pin: "GND",
        microcontrollerPin: "GND",
        description: "Ground",
      },
      {
        component: "DHT22",
        pin: "DATA",
        microcontrollerPin: "GPIO4",
        description: "Data pin",
      },
      {
        component: "OLED",
        pin: "VCC",
        microcontrollerPin: "3.3V",
        description: "Power",
      },
      {
        component: "OLED",
        pin: "GND",
        microcontrollerPin: "GND",
        description: "Ground",
      },
      {
        component: "OLED",
        pin: "SDA",
        microcontrollerPin: "GPIO21",
        description: "I2C Data",
      },
      {
        component: "OLED",
        pin: "SCL",
        microcontrollerPin: "GPIO22",
        description: "I2C Clock",
      },
    ],
    sourceCode: `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <WiFi.h>

#define DHTPIN 4
#define DHTTYPE DHT22
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

DHT dht(DHTPIN, DHTTYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 allocation failed");
    for (;;);
  }
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println("Connecting WiFi...");
  display.display();
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\\nWiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.print(temperature, 1);
  display.println(" C");
  
  display.setTextSize(1);
  display.setCursor(0, 30);
  display.print("Humidity: ");
  display.print(humidity, 1);
  display.println("%");
  
  display.setCursor(0, 50);
  display.print("IP: ");
  display.println(WiFi.localIP());
  display.display();
  
  Serial.print("Temp: ");
  Serial.print(temperature);
  Serial.print("C  Humidity: ");
  Serial.println(humidity);
  
  delay(2000);
}`,
    codeLanguage: "cpp",
    steps: [
      {
        stepNumber: 1,
        title: "Install Required Libraries",
        content:
          "Open the Arduino IDE and go to Tools → Manage Libraries. Search for and install: Adafruit SSD1306, Adafruit GFX Library, and DHT sensor library.",
      },
      {
        stepNumber: 2,
        title: "Wire the Circuit",
        content:
          "Connect the DHT22 sensor and OLED display to your ESP32 following the wiring table above. Use the breadboard to keep connections tidy.",
      },
      {
        stepNumber: 3,
        title: "Upload the Code",
        content:
          "Copy the code above into the Arduino IDE. Replace YOUR_WIFI_SSID and YOUR_WIFI_PASSWORD with your network credentials. Select the ESP32 board and upload.",
      },
      {
        stepNumber: 4,
        title: "Test the Monitor",
        content:
          "After uploading, open the Serial Monitor at 115200 baud. You should see temperature and humidity readings. The OLED will display the same data plus your IP address.",
      },
    ],
    prerequisites: [
      "Basic Arduino IDE knowledge",
      "Understanding of I2C protocol",
    ],
    learningOutcomes: [
      "Interface DHT22 sensor with ESP32",
      "Display data on OLED screen",
      "Connect ESP32 to WiFi",
      "Read and parse sensor data",
    ],
    relatedProductIds: ["prod-5", "prod-1", "prod-11"],
    relatedTutorialIds: ["tut-2", "tut-3"],
    coverImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    views: 4521,
    featured: true,
    published: true,
    author: "IoTMart Team",
    tags: ["esp32", "dht22", "oled", "wifi", "temperature", "humidity"],
    createdAt: "2025-06-10T00:00:00Z",
    updatedAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "tut-2",
    title: "Arduino Motion-Activated Security Alert System",
    slug: "arduino-motion-activated-security-alert",
    description:
      "Learn to build a PIR-based security system with Arduino that triggers a buzzer and LED alert when motion is detected. Optionally log events to an SD card.",
    shortDescription:
      "PIR motion sensor security system with buzzer alert using Arduino Uno.",
    difficulty: "Beginner",
    estimatedTime: "1–2 hours",
    category: security,
    components: [
      "Arduino Uno",
      "HC-SR501 PIR Sensor",
      "Active Buzzer",
      "Red LED",
      "330Ω Resistor",
      "Breadboard",
      "Jumper Wires",
    ],
    sensors: ["HC-SR501 PIR Motion Sensor"],
    microcontrollers: ["Arduino Uno"],
    wiringInstructions: [
      { component: "PIR Sensor", pin: "VCC", microcontrollerPin: "5V" },
      { component: "PIR Sensor", pin: "GND", microcontrollerPin: "GND" },
      { component: "PIR Sensor", pin: "OUT", microcontrollerPin: "D2" },
      { component: "Buzzer", pin: "+", microcontrollerPin: "D8" },
      { component: "Buzzer", pin: "-", microcontrollerPin: "GND" },
      { component: "LED", pin: "Anode", microcontrollerPin: "D13 (via 330Ω)" },
      { component: "LED", pin: "Cathode", microcontrollerPin: "GND" },
    ],
    sourceCode: `const int PIR_PIN = 2;
const int BUZZER_PIN = 8;
const int LED_PIN = 13;

void setup() {
  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Security System Ready");
  delay(2000); // Allow PIR to stabilize
}

void loop() {
  int motionDetected = digitalRead(PIR_PIN);
  
  if (motionDetected == HIGH) {
    Serial.println("MOTION DETECTED!");
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 1000, 500); // 1kHz beep for 500ms
    delay(1000);
  } else {
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
  }
}`,
    codeLanguage: "cpp",
    steps: [
      {
        stepNumber: 1,
        title: "Assemble the Circuit",
        content:
          "Place the PIR sensor, buzzer, and LED on a breadboard. Connect according to the wiring table.",
      },
      {
        stepNumber: 2,
        title: "Upload and Test",
        content:
          "Upload the code. Wait 30 seconds for the PIR to calibrate. Walk in front of it to trigger the alarm.",
      },
    ],
    prerequisites: ["Basic Arduino programming"],
    learningOutcomes: [
      "Read digital sensor output",
      "Control buzzer with tone()",
      "Build a basic alarm system",
    ],
    relatedProductIds: ["prod-4", "prod-2"],
    relatedTutorialIds: ["tut-1", "tut-4"],
    coverImage:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    views: 3210,
    featured: true,
    published: true,
    author: "IoTMart Team",
    tags: ["arduino", "pir", "security", "motion", "alarm"],
    createdAt: "2025-07-01T00:00:00Z",
    updatedAt: "2025-11-05T00:00:00Z",
  },
  {
    id: "tut-3",
    title: "Smart Irrigation System with Soil Moisture Sensor",
    slug: "smart-irrigation-soil-moisture-sensor",
    description:
      "Build an automated plant watering system using a soil moisture sensor and Arduino. The system reads soil moisture levels and automatically activates a water pump relay when the soil is dry.",
    shortDescription:
      "Automated plant watering with soil moisture sensor and relay module.",
    difficulty: "Intermediate",
    estimatedTime: "3–4 hours",
    category: smartAg,
    components: [
      "Arduino Uno",
      "Soil Moisture Sensor",
      "5V Relay Module",
      "Mini Water Pump",
      "Silicon Tubing",
      "9V Battery",
      "Jumper Wires",
    ],
    sensors: ["Capacitive Soil Moisture Sensor"],
    microcontrollers: ["Arduino Uno"],
    wiringInstructions: [
      { component: "Moisture Sensor", pin: "VCC", microcontrollerPin: "5V" },
      { component: "Moisture Sensor", pin: "GND", microcontrollerPin: "GND" },
      { component: "Moisture Sensor", pin: "AOUT", microcontrollerPin: "A0" },
      { component: "Relay", pin: "VCC", microcontrollerPin: "5V" },
      { component: "Relay", pin: "GND", microcontrollerPin: "GND" },
      { component: "Relay", pin: "IN", microcontrollerPin: "D7" },
    ],
    sourceCode: `const int MOISTURE_PIN = A0;
const int RELAY_PIN = 7;
const int DRY_THRESHOLD = 600;   // Adjust for your soil
const int WET_THRESHOLD = 300;

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Relay OFF (active LOW)
  Serial.begin(9600);
  Serial.println("Smart Irrigation System Started");
}

void loop() {
  int moisture = analogRead(MOISTURE_PIN);
  Serial.print("Moisture: ");
  Serial.println(moisture);
  
  if (moisture > DRY_THRESHOLD) {
    Serial.println("Soil DRY - Watering...");
    digitalWrite(RELAY_PIN, LOW); // Relay ON
    delay(3000); // Water for 3 seconds
    digitalWrite(RELAY_PIN, HIGH); // Relay OFF
  } else if (moisture < WET_THRESHOLD) {
    Serial.println("Soil WET - No watering needed");
  }
  
  delay(5000); // Check every 5 seconds
}`,
    codeLanguage: "cpp",
    steps: [
      {
        stepNumber: 1,
        title: "Set Up the Circuit",
        content: "Connect the soil moisture sensor and relay module to Arduino.",
      },
      {
        stepNumber: 2,
        title: "Connect the Pump",
        content:
          "Wire the water pump to the NO (Normally Open) and COM terminals of the relay.",
      },
      {
        stepNumber: 3,
        title: "Calibrate Thresholds",
        content:
          "Upload the code, open Serial Monitor, and test the sensor in dry and wet soil to find the right thresholds for your setup.",
      },
    ],
    prerequisites: [
      "Arduino basics",
      "Understanding of analog sensors",
      "Basic electrical safety",
    ],
    learningOutcomes: [
      "Read analog sensor data",
      "Control a relay module",
      "Build automated systems",
    ],
    relatedProductIds: ["prod-4", "prod-8"],
    relatedTutorialIds: ["tut-1", "tut-2"],
    coverImage:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
    views: 2890,
    featured: false,
    published: true,
    author: "IoTMart Team",
    tags: ["arduino", "soil moisture", "relay", "automation", "gardening"],
    createdAt: "2025-08-10T00:00:00Z",
    updatedAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "tut-4",
    title: "ESP32 Web Server with Real-Time Sensor Dashboard",
    slug: "esp32-web-server-real-time-sensor-dashboard",
    description:
      "Create a local web server on the ESP32 that serves a beautiful real-time sensor dashboard. View temperature, humidity, and motion data on any device connected to your home network.",
    shortDescription:
      "ESP32 local web server showing real-time sensor data dashboard.",
    difficulty: "Intermediate",
    estimatedTime: "4–5 hours",
    category: homeAuto,
    components: [
      "ESP32 DevKit",
      "DHT22 Sensor",
      "HC-SR501 PIR Sensor",
      "Breadboard",
      "Jumper Wires",
    ],
    sensors: ["DHT22", "HC-SR501 PIR"],
    microcontrollers: ["ESP32"],
    wiringInstructions: [
      { component: "DHT22", pin: "DATA", microcontrollerPin: "GPIO4" },
      { component: "PIR", pin: "OUT", microcontrollerPin: "GPIO15" },
    ],
    sourceCode: `#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

#define DHTPIN 4
#define PIRPIN 15
DHT dht(DHTPIN, DHT22);
WebServer server(80);

const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

String buildHTML() {
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  bool motion = digitalRead(PIRPIN);
  
  return "<!DOCTYPE html><html><head>"
    "<title>IoT Dashboard</title>"
    "<meta http-equiv='refresh' content='5'>"
    "<style>body{font-family:sans-serif;background:#F0E9E3;padding:2rem;}"
    "h1{color:#5D1C34;}.card{background:#fff;border-radius:8px;padding:1.5rem;"
    "margin:1rem 0;box-shadow:0 2px 8px rgba(0,0,0,0.1);}"
    ".value{font-size:2rem;font-weight:bold;color:#A67D45;}</style>"
    "</head><body>"
    "<h1>IoT Sensor Dashboard</h1>"
    "<div class='card'><p>Temperature</p><p class='value'>" + String(temp, 1) + " °C</p></div>"
    "<div class='card'><p>Humidity</p><p class='value'>" + String(humidity, 1) + " %</p></div>"
    "<div class='card'><p>Motion</p><p class='value'>" + (motion ? "DETECTED" : "Clear") + "</p></div>"
    "</body></html>";
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(PIRPIN, INPUT);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  
  Serial.print("Server at: http://");
  Serial.println(WiFi.localIP());
  
  server.on("/", []() {
    server.send(200, "text/html", buildHTML());
  });
  server.begin();
}

void loop() {
  server.handleClient();
}`,
    codeLanguage: "cpp",
    steps: [
      {
        stepNumber: 1,
        title: "Connect Sensors",
        content: "Wire the DHT22 and PIR sensors to the ESP32.",
      },
      {
        stepNumber: 2,
        title: "Set WiFi Credentials",
        content: "Update SSID and password in the code.",
      },
      {
        stepNumber: 3,
        title: "Open Dashboard",
        content:
          "After uploading, check Serial Monitor for the IP address. Open it in any browser on your network.",
      },
    ],
    prerequisites: [
      "ESP32 Arduino setup",
      "Basic HTML",
      "Completed Tutorial 1",
    ],
    learningOutcomes: [
      "Create a web server on ESP32",
      "Serve dynamic HTML pages",
      "Build real-time dashboards",
    ],
    relatedProductIds: ["prod-5", "prod-1", "prod-9"],
    relatedTutorialIds: ["tut-1", "tut-5"],
    coverImage:
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&q=80",
    views: 5102,
    featured: true,
    published: true,
    author: "IoTMart Team",
    tags: ["esp32", "web server", "dashboard", "real-time", "wifi"],
    createdAt: "2025-09-01T00:00:00Z",
    updatedAt: "2025-11-10T00:00:00Z",
  },
  {
    id: "tut-5",
    title: "Line-Following Robot with Arduino",
    slug: "line-following-robot-arduino",
    description:
      "Build a classic two-wheeled line-following robot using Arduino, IR sensors, and L298N motor driver. A great robotics project for understanding sensor-based control systems.",
    shortDescription:
      "Two-wheeled robot that follows a black line using IR sensors.",
    difficulty: "Intermediate",
    estimatedTime: "6–8 hours",
    category: robotics,
    components: [
      "Arduino Uno",
      "L298N Motor Driver",
      "2× DC Motors with Wheels",
      "2× IR Line Sensors",
      "Robot Chassis",
      "9V Battery",
    ],
    sensors: ["IR Reflective Sensor (×2)"],
    microcontrollers: ["Arduino Uno"],
    wiringInstructions: [
      { component: "Left IR Sensor", pin: "OUT", microcontrollerPin: "D2" },
      { component: "Right IR Sensor", pin: "OUT", microcontrollerPin: "D3" },
      { component: "L298N", pin: "IN1", microcontrollerPin: "D5" },
      { component: "L298N", pin: "IN2", microcontrollerPin: "D6" },
      { component: "L298N", pin: "IN3", microcontrollerPin: "D9" },
      { component: "L298N", pin: "IN4", microcontrollerPin: "D10" },
    ],
    sourceCode: `#define LEFT_IR   2
#define RIGHT_IR  3
#define IN1 5
#define IN2 6
#define IN3 9
#define IN4 10

void setup() {
  pinMode(LEFT_IR, INPUT);
  pinMode(RIGHT_IR, INPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
}

void moveForward() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}
void turnLeft() {
  digitalWrite(IN1, LOW);  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}
void turnRight() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);  digitalWrite(IN4, LOW);
}
void stopMotors() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
}

void loop() {
  int left  = digitalRead(LEFT_IR);
  int right = digitalRead(RIGHT_IR);
  
  if (left == LOW && right == LOW) {
    moveForward();          // Both on line
  } else if (left == HIGH && right == LOW) {
    turnRight();            // Drifted left
  } else if (left == LOW && right == HIGH) {
    turnLeft();             // Drifted right
  } else {
    stopMotors();           // Off line
  }
}`,
    codeLanguage: "cpp",
    steps: [
      {
        stepNumber: 1,
        title: "Assemble the Chassis",
        content:
          "Mount the motors, wheels, and Arduino on the robot chassis. Position the two IR sensors at the front bottom.",
      },
      {
        stepNumber: 2,
        title: "Connect the Motor Driver",
        content:
          "Connect the L298N motor driver between the Arduino and motors following the wiring diagram.",
      },
      {
        stepNumber: 3,
        title: "Create the Track",
        content:
          "Draw a black line on white paper or tape black electrical tape on the floor. The track should have gradual curves.",
      },
      {
        stepNumber: 4,
        title: "Calibrate Sensors",
        content:
          "Test the IR sensors over the black and white surfaces. Adjust the threshold potentiometers on the sensors if needed.",
      },
    ],
    prerequisites: [
      "Arduino basics",
      "DC motor control",
      "Understanding of digital sensors",
    ],
    learningOutcomes: [
      "Control DC motors with L298N",
      "Use IR sensors for line detection",
      "Implement feedback control logic",
    ],
    relatedProductIds: ["prod-4", "prod-10"],
    relatedTutorialIds: ["tut-2", "tut-4"],
    coverImage:
      "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=800&q=80",
    views: 3780,
    featured: false,
    published: true,
    author: "IoTMart Team",
    tags: ["arduino", "robot", "line following", "motors", "L298N"],
    createdAt: "2025-10-01T00:00:00Z",
    updatedAt: "2025-11-15T00:00:00Z",
  },
];

export const featuredTutorials = tutorials.filter((t) => t.featured);

export function getTutorialBySlug(slug: string): Tutorial | undefined {
  return tutorials.find((t) => t.slug === slug);
}

export function getTutorialById(id: string): Tutorial | undefined {
  return tutorials.find((t) => t.id === id);
}

export function getRelatedTutorials(tutorialId: string): Tutorial[] {
  const tutorial = getTutorialById(tutorialId);
  if (!tutorial) return [];
  return tutorial.relatedTutorialIds
    .map((id) => getTutorialById(id))
    .filter(Boolean) as Tutorial[];
}
