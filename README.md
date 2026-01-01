# E-Commerce Price Monitor

## About

E-Commerce Price Monitor is a web application that helps you track prices of products from popular e-commerce websites. Set your desired price and get notified when prices drop below your target.

## Features

- Track products from Myntra, Amazon, and Flipkart
- Set desired prices for products
- Get notified via Telegram when prices drop
- Background scanning runs automatically
- Responsive design works on mobile and desktop
- Filter and sort your tracked products

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- NPM or Yarn

### Installation

1. Clone this repository
2. Install dependencies:
```bash
npm install
# or
yarn install
```
3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

### Usage

1. Open your browser and go to http://localhost:3000
2. Add products you want to track 
3. Set desired prices for products
4. Get notified when prices drop

## Background Scanner

The application includes automated background scanning to check prices without requiring the web interface to be open.

### Running a Single Scan

To run a single scan manually:

```bash
npm run scan
# or
yarn scan
```

### Running Continuous Scanner

There are two ways to run the continuous scanner daemon:

#### Using Node.js (Cross-platform)

For all platforms (Windows, macOS, Linux):

```bash
npm run daemon [interval_minutes]
# or
yarn daemon [interval_minutes]
```

Where `interval_minutes` is optional and defaults to 1 minute.

#### Using Bash Script (Linux/macOS only)

For Linux and macOS:

```bash
./scripts/scanner-watchdog.sh [delay_minutes]
```

Where `delay_minutes` is optional and defaults to 1 minute.

### Setting Up as a Service

For production use, consider setting up the scanner daemon as a service:

#### Linux (systemd)

Create a service file at `/etc/systemd/system/ecom-scanner.service`:

```ini
[Unit]
Description=E-Commerce Price Monitor Background Scanner
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/application
ExecStart=/usr/bin/node /path/to/application/scripts/scanner-daemon.js 30
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=ecom-scanner

[Install]
WantedBy=multi-user.target
```

Then enable and start the service:

```bash
sudo systemctl enable ecom-scanner
sudo systemctl start ecom-scanner
```

## License

This project is licensed under the MIT License
